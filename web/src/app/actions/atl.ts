"use server";

import { revalidatePath } from "next/cache";
import { dbQuery, dbQueryOne, newId, withTransaction } from "@/lib/db/pool";
import { getSession } from "@/lib/auth/session";
import {
  authAdminCreateUser,
  authAdminDeleteUser,
} from "@/lib/auth/supabase-admin";
import {
  EXEC_DEADLINE_DAYS,
  LeadHandoffAction,
  QualificationStatus,
  SalesStage,
  UserRole,
} from "@/lib/constants";
import { logLeadHandoff } from "@/lib/lead-handoff-log";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function createLeadAnalystMember(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ANALYST_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const analystTeamName = String(
    formData.get("analystTeamName") ?? "",
  ).trim();

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }
  if (!analystTeamName) {
    return { error: "Team name is required (use it to group analysts when you have more than one team)." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const exists = await dbQueryOne<{ id: string }>(
    `SELECT id FROM "User" WHERE email = $1`,
    [email],
  );
  if (exists) return { error: "That email is already in use." };

  let authUserId: string;
  try {
    authUserId = await authAdminCreateUser(email, password);
  } catch (e) {
    console.error("[createLeadAnalystMember] auth create:", e);
    return { error: "Something went wrong. Please try again." };
  }

  const uid = newId();
  try {
    await dbQuery(
      `INSERT INTO "User" (id, email, name, role, "authUserId", "passwordHash", "mustResetPassword", "managerId", "analystTeamName", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        uid,
        email,
        name,
        UserRole.LEAD_ANALYST,
        authUserId,
        password,
        session.id,
        analystTeamName,
      ],
    );
  } catch {
    await authAdminDeleteUser(authUserId).catch(() => {});
    return { error: "Could not save the user profile. Try again." };
  }

  revalidatePath("/analyst-team-lead");
  revalidatePath("/analyst-team-lead/team");
  revalidatePath("/analyst-team-lead/reports");
  return {
    ok: true as const,
    name,
    email,
    analystTeamName,
    temporaryPassword: password,
  };
}

export async function createMainTeamLeadAndTeam(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ANALYST_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }

  const teamName = String(formData.get("teamName") ?? "").trim();
  const leadName = String(formData.get("leadName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!teamName || !leadName || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const exists = await dbQueryOne<{ id: string }>(
    `SELECT id FROM "User" WHERE email = $1`,
    [email],
  );
  if (exists) return { error: "That email is already in use." };

  let authUserId: string;
  try {
    authUserId = await authAdminCreateUser(email, password);
  } catch (e) {
    console.error("[createMainTeamLeadAndTeam] auth create:", e);
    return { error: "Something went wrong. Please try again." };
  }

  const mtlId = newId();
  const teamId = newId();
  try {
    await withTransaction(async (c) => {
      await c.query(
        `INSERT INTO "User" (id, email, name, role, "authUserId", "passwordHash", "mustResetPassword", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [mtlId, email, leadName, UserRole.MAIN_TEAM_LEAD, authUserId, password],
      );
      await c.query(
        `INSERT INTO "Team" (id, name, "mainTeamLeadId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [teamId, teamName, mtlId],
      );
      await c.query(
        `UPDATE "User" SET "teamId" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
        [teamId, mtlId],
      );
    });
  } catch {
    await authAdminDeleteUser(authUserId).catch(() => {});
    return { error: "Could not create team or profile. Try again." };
  }

  revalidatePath("/analyst-team-lead");
  revalidatePath("/analyst-team-lead/team");
  revalidatePath("/analyst-team-lead/reports");
  return {
    ok: true as const,
    teamName,
    leadName,
    email,
    temporaryPassword: password,
  };
}

export async function assignLeadToMainTeamLead(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ANALYST_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }

  const leadId = String(formData.get("leadId") ?? "");
  const mainTeamLeadId = String(formData.get("mainTeamLeadId") ?? "");

  if (!leadId || !mainTeamLeadId) {
    return { error: "Lead and main team lead are required." };
  }

  const lead = await dbQueryOne<{
    qualificationStatus: string;
    createdById: string;
  }>(
    `SELECT "qualificationStatus", "createdById" FROM "Lead" WHERE id = $1`,
    [leadId],
  );
  if (!lead) return { error: "Lead not found." };
  if (lead.qualificationStatus !== QualificationStatus.QUALIFIED) {
    if (lead.qualificationStatus === QualificationStatus.NOT_QUALIFIED) {
      return {
        error:
          "Not qualified leads cannot be routed to a main team. The analyst must set qualification to Qualified first.",
      };
    }
    if (lead.qualificationStatus === QualificationStatus.IRRELEVANT) {
      return {
        error:
          "Irrelevant leads cannot be routed to a main team.",
      };
    }
    return { error: "Only qualified leads can be assigned to a main team." };
  }

  const analystRows = await dbQuery<{ id: string }>(
    `SELECT id FROM "User" WHERE "managerId" = $1 AND role = $2`,
    [session.id, UserRole.LEAD_ANALYST],
  );
  const allowedAnalystIds = new Set(analystRows.map((a) => a.id));
  if (!allowedAnalystIds.has(lead.createdById)) {
    return { error: "You can only route leads from analysts on your team." };
  }

  const mtl = await dbQueryOne<{
    id: string;
    name: string;
    teamId: string;
    teamName: string;
  }>(
    `SELECT u.id, u.name, t.id AS "teamId", t.name AS "teamName"
     FROM "User" u
     INNER JOIN "Team" t ON t."mainTeamLeadId" = u.id
     WHERE u.id = $1 AND u.role = $2`,
    [mainTeamLeadId, UserRole.MAIN_TEAM_LEAD],
  );
  if (!mtl) {
    return { error: "Invalid main team lead." };
  }

  await dbQuery(
    `UPDATE "Lead" SET
      "assignedMainTeamLeadId" = $1,
      "teamId" = $2,
      "salesStage" = $3,
      "assignedSalesExecId" = NULL,
      "execAssignedAt" = NULL,
      "execDeadlineAt" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [
      mtl.id,
      mtl.teamId,
      SalesStage.WITH_TEAM_LEAD,
      leadId,
    ],
  );

  await logLeadHandoff({
    leadId,
    action: LeadHandoffAction.ROUTED_TO_MAIN_TEAM,
    actorId: session.id,
    detail: `Main team lead: ${mtl.name} · Team: ${mtl.teamName}`,
  });

  revalidatePath("/analyst-team-lead");
  revalidatePath("/analyst-team-lead/leads");
  revalidatePath("/analyst-team-lead/reports");
  revalidatePath("/team-lead");
  revalidatePath("/team-lead/reports");
  revalidatePath("/analyst");
  return { ok: true as const };
}

export async function assignLeadDirectToExecutiveByAtl(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ANALYST_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }

  const leadId = String(formData.get("leadId") ?? "").trim();
  const mainTeamLeadId = String(formData.get("mainTeamLeadId") ?? "").trim();
  const salesExecId = String(formData.get("salesExecId") ?? "").trim();

  if (!leadId || !mainTeamLeadId || !salesExecId) {
    return { error: "Lead, main team lead, and sales executive are required." };
  }

  const lead = await dbQueryOne<{
    qualificationStatus: string;
    createdById: string;
    salesStage: string;
  }>(
    `SELECT "qualificationStatus", "createdById", "salesStage" FROM "Lead" WHERE id = $1`,
    [leadId],
  );
  if (!lead) return { error: "Lead not found." };
  if (lead.qualificationStatus !== QualificationStatus.QUALIFIED) {
    if (lead.qualificationStatus === QualificationStatus.NOT_QUALIFIED) {
      return {
        error:
          "Not qualified leads cannot be assigned. The analyst must set qualification to Qualified first.",
      };
    }
    if (lead.qualificationStatus === QualificationStatus.IRRELEVANT) {
      return { error: "Irrelevant leads cannot be assigned." };
    }
    return { error: "Only qualified leads can be directly assigned." };
  }
  if (
    lead.salesStage === SalesStage.CLOSED_WON ||
    lead.salesStage === SalesStage.CLOSED_LOST
  ) {
    return { error: "Closed leads cannot be reassigned directly." };
  }

  const analystRows = await dbQuery<{ id: string }>(
    `SELECT id FROM "User" WHERE "managerId" = $1 AND role = $2`,
    [session.id, UserRole.LEAD_ANALYST],
  );
  const allowedAnalystIds = new Set(analystRows.map((a) => a.id));
  if (!allowedAnalystIds.has(lead.createdById)) {
    return { error: "You can only assign leads from analysts on your team." };
  }

  const mtl = await dbQueryOne<{
    id: string;
    name: string;
    teamId: string;
    teamName: string;
  }>(
    `SELECT u.id, u.name, t.id AS "teamId", t.name AS "teamName"
     FROM "User" u
     INNER JOIN "Team" t ON t."mainTeamLeadId" = u.id
     WHERE u.id = $1 AND u.role = $2`,
    [mainTeamLeadId, UserRole.MAIN_TEAM_LEAD],
  );
  if (!mtl) return { error: "Invalid main team lead." };

  const exec = await dbQueryOne<{
    id: string;
    name: string;
    email: string;
  }>(
    `SELECT id, name, email FROM "User"
     WHERE id = $1 AND role = $2 AND "teamId" = $3`,
    [salesExecId, UserRole.SALES_EXECUTIVE, mtl.teamId],
  );
  if (!exec) {
    return {
      error: "Invalid sales executive for the selected main team lead/team.",
    };
  }

  const now = new Date();
  await dbQuery(
    `UPDATE "Lead" SET
      "assignedMainTeamLeadId" = $1,
      "teamId" = $2,
      "assignedSalesExecId" = $3,
      "salesStage" = $4,
      "execAssignedAt" = $5,
      "execDeadlineAt" = $6,
      "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [
      mtl.id,
      mtl.teamId,
      exec.id,
      SalesStage.WITH_EXECUTIVE,
      now,
      addDays(now, EXEC_DEADLINE_DAYS),
      leadId,
    ],
  );

  await logLeadHandoff({
    leadId,
    action: LeadHandoffAction.DIRECT_ASSIGNED_TO_EXECUTIVE_BY_ATL,
    actorId: session.id,
    detail: `Main team lead: ${mtl.name} · Team: ${mtl.teamName} · Sales executive: ${exec.name} (${exec.email})`,
  });

  revalidatePath("/analyst-team-lead");
  revalidatePath("/analyst-team-lead/leads");
  revalidatePath("/analyst-team-lead/reports");
  revalidatePath("/team-lead");
  revalidatePath("/team-lead/leads");
  revalidatePath("/team-lead/reports");
  revalidatePath("/executive");
  revalidatePath("/analyst");
  return { ok: true as const };
}
