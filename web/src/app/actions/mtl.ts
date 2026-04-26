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
  SalesStage,
  UserRole,
} from "@/lib/constants";
import { logLeadHandoff } from "@/lib/lead-handoff-log";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function createSalesExecutive(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.MAIN_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }

  if (!session.teamId) {
    return { error: "Your account is not linked to a team." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
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
    console.error("[createSalesExecutive] auth create:", e);
    return { error: "Something went wrong. Please try again." };
  }

  const uid = newId();
  try {
    await dbQuery(
      `INSERT INTO "User" (id, email, name, role, "authUserId", "passwordHash", "mustResetPassword", "teamId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        uid,
        email,
        name,
        UserRole.SALES_EXECUTIVE,
        authUserId,
        password,
        session.teamId,
      ],
    );
  } catch {
    await authAdminDeleteUser(authUserId).catch(() => {});
    return { error: "Could not save the user profile. Try again." };
  }

  revalidatePath("/team-lead");
  revalidatePath("/team-lead/leads");
  revalidatePath("/team-lead/reports");
  revalidatePath("/team-lead/team");
  return {
    ok: true as const,
    name,
    email,
    temporaryPassword: password,
  };
}

export async function assignLeadToExecutive(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.MAIN_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }

  const leadId = String(formData.get("leadId") ?? "");
  const execId = String(formData.get("salesExecId") ?? "");

  if (!leadId || !execId) {
    return { error: "Lead and sales executive are required." };
  }

  const lead = await dbQueryOne<{
    assignedMainTeamLeadId: string | null;
    teamId: string | null;
  }>(
    `SELECT "assignedMainTeamLeadId", "teamId" FROM "Lead" WHERE id = $1`,
    [leadId],
  );
  if (!lead) return { error: "Lead not found." };
  if (lead.assignedMainTeamLeadId !== session.id) {
    return { error: "This lead is not assigned to you." };
  }

  const exec = await dbQueryOne<{
    id: string;
    name: string;
    email: string;
  }>(
    `SELECT id, name, email FROM "User"
     WHERE id = $1 AND role = $2 AND "teamId" IS NOT DISTINCT FROM $3`,
    [execId, UserRole.SALES_EXECUTIVE, lead.teamId],
  );
  if (!exec) return { error: "Invalid sales executive for this team." };

  const now = new Date();
  await dbQuery(
    `UPDATE "Lead" SET
      "assignedSalesExecId" = $1,
      "salesStage" = $2,
      "execAssignedAt" = $3,
      "execDeadlineAt" = $4,
      "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [
      exec.id,
      SalesStage.WITH_EXECUTIVE,
      now,
      addDays(now, EXEC_DEADLINE_DAYS),
      leadId,
    ],
  );

  await logLeadHandoff({
    leadId,
    action: LeadHandoffAction.ASSIGNED_TO_EXECUTIVE,
    actorId: session.id,
    detail: `Sales executive: ${exec.name} (${exec.email})`,
  });

  revalidatePath("/team-lead");
  revalidatePath("/team-lead/leads");
  revalidatePath("/team-lead/reports");
  revalidatePath("/executive");
  revalidatePath("/analyst");
  revalidatePath("/analyst-team-lead");
  return { ok: true as const };
}

/**
 * Move a sales executive from the current MTL’s team to another team.
 * Active leads (WITH_EXECUTIVE) assigned by this MTL to that rep are returned to WITH_TEAM_LEAD without an exec.
 */
export async function transferSalesExecutiveToTeam(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.MAIN_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }
  if (!session.teamId) {
    return { error: "Your account is not linked to a team." };
  }

  const salesExecId = String(formData.get("salesExecId") ?? "").trim();
  const targetTeamId = String(formData.get("targetTeamId") ?? "").trim();

  if (!salesExecId || !targetTeamId) {
    return { error: "Sales executive and destination team are required." };
  }
  if (targetTeamId === session.teamId) {
    return { error: "Choose a team other than the current one." };
  }

  const exec = await dbQueryOne<{ id: string }>(
    `SELECT id FROM "User"
     WHERE id = $1 AND role = $2 AND "teamId" = $3`,
    [salesExecId, UserRole.SALES_EXECUTIVE, session.teamId],
  );
  if (!exec) {
    return { error: "That sales executive is not on your team." };
  }

  const targetTeam = await dbQueryOne<{ id: string }>(
    `SELECT id FROM "Team" WHERE id = $1`,
    [targetTeamId],
  );
  if (!targetTeam) {
    return { error: "Destination team not found." };
  }

  const transferId = newId();
  await withTransaction(async (c) => {
    await c.query(
      `UPDATE "User" SET "teamId" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
      [targetTeamId, salesExecId],
    );

    await c.query(
      `UPDATE "Lead" SET
        "assignedSalesExecId" = NULL,
        "salesStage" = $1,
        "execAssignedAt" = NULL,
        "execDeadlineAt" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE "assignedSalesExecId" = $2 AND "assignedMainTeamLeadId" = $3 AND "salesStage" = $4`,
      [
        SalesStage.WITH_TEAM_LEAD,
        salesExecId,
        session.id,
        SalesStage.WITH_EXECUTIVE,
      ],
    );

    await c.query(
      `INSERT INTO "SalesExecTeamTransfer" (id, "salesExecId", "fromTeamId", "toTeamId", "transferredById", "createdAt")
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        transferId,
        salesExecId,
        session.teamId,
        targetTeamId,
        session.id,
      ],
    );
  });

  revalidatePath("/team-lead", "layout");
  revalidatePath("/executive");
  revalidatePath("/analyst");
  revalidatePath("/analyst-team-lead");
  revalidatePath("/superadmin");
  return { ok: true as const };
}
