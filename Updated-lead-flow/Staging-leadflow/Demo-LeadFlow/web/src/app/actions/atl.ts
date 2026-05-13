"use server";

import { revalidatePath } from "next/cache";
import { dbQuery, dbQueryOne, newId, withTransaction, rpcJsonParamTextArrayUnpack } from "@/lib/db/pool";
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
import { fetchAtlLeadsExportRows } from "@/lib/atl-lead-table-fetch";
import { fetchAtlRoutingTimelines } from "@/lib/atl-routing-timeline";
import { atlLeadSql } from "@/lib/atl-leads";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import type { PortalAtlLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { syncUserPasswordWithAuth } from "@/lib/sync-user-password";
import { teamAnalystTeamLeadColumnExists, claimUnassignedTeamsForSessionIfSingleAtlOrg } from "@/lib/team-atl-column";

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
        null,
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
  revalidatePath("/analyst-team-lead/qualified-pipeline");
  return {
    ok: true as const,
    userId: uid,
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

  await claimUnassignedTeamsForSessionIfSingleAtlOrg(session.id);

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
  const teamCol = await teamAnalystTeamLeadColumnExists();
  try {
    await withTransaction(async (c) => {
      await c.query(
        `INSERT INTO "User" (id, email, name, role, "authUserId", "passwordHash", "mustResetPassword", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [mtlId, email, leadName, UserRole.MAIN_TEAM_LEAD, authUserId, null],
      );
      if (teamCol) {
        await c.query(
          `INSERT INTO "Team" (id, name, "mainTeamLeadId", "analystTeamLeadId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [teamId, teamName, mtlId, session.id],
        );
      } else {
        await c.query(
          `INSERT INTO "Team" (id, name, "mainTeamLeadId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [teamId, teamName, mtlId],
        );
      }
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
  revalidatePath("/analyst-team-lead/qualified-pipeline");
  return {
    ok: true as const,
    userId: mtlId,
    teamName,
    leadName,
    email,
    temporaryPassword: password,
  };
}

/** ATL-only: update qualification for leads created by analysts on their team (mirrors analyst list scope). */
export async function updateLeadQualificationAtl(
  leadId: string,
  qualificationStatus: string,
) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ANALYST_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }

  if (
    qualificationStatus !== QualificationStatus.QUALIFIED &&
    qualificationStatus !== QualificationStatus.NOT_QUALIFIED &&
    qualificationStatus !== QualificationStatus.IRRELEVANT
  ) {
    return { error: "Invalid qualification." };
  }

  const analystRows = await dbQuery<{ id: string }>(
    `SELECT id FROM "User" WHERE "managerId" = $1 AND role = $2`,
    [session.id, UserRole.LEAD_ANALYST],
  );
  const analystIds = analystRows.map((a) => a.id);
  if (analystIds.length === 0) {
    return { error: "No lead analysts on your team yet." };
  }

  const lead = await dbQueryOne<{ id: string }>(
    `SELECT l.id FROM "Lead" l WHERE l.id = $1 AND l."createdById" = ANY(${rpcJsonParamTextArrayUnpack(2)})`,
    [leadId, analystIds],
  );
  if (!lead) return { error: "Lead not found." };

  await dbQuery(
    `UPDATE "Lead" SET "qualificationStatus" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
    [qualificationStatus, leadId],
  );

  revalidatePath("/analyst-team-lead", "layout");
  revalidatePath("/analyst", "layout");
  revalidatePath("/superadmin");
  return { ok: true as const };
}

export async function assignLeadToMainTeamLead(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ANALYST_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }

  await claimUnassignedTeamsForSessionIfSingleAtlOrg(session.id);

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

  const teamCol = await teamAnalystTeamLeadColumnExists();

  const mtl = teamCol
    ? await dbQueryOne<{
        id: string;
        name: string;
        teamId: string;
        teamName: string;
        analystTeamLeadId: string | null;
      }>(
        `SELECT u.id, u.name, t.id AS "teamId", t.name AS "teamName", t."analystTeamLeadId"
     FROM "User" u
     INNER JOIN "Team" t ON t."mainTeamLeadId" = u.id
     WHERE u.id = $1 AND u.role = $2`,
        [mainTeamLeadId, UserRole.MAIN_TEAM_LEAD],
      )
    : await dbQueryOne<{
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
  if (
    teamCol &&
    "analystTeamLeadId" in mtl &&
    mtl.analystTeamLeadId != null &&
    mtl.analystTeamLeadId !== session.id
  ) {
    return {
      error:
        "You can only route leads to main team leads that belong to your team directory.",
    };
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
  revalidatePath("/analyst-team-lead/qualified-pipeline");
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

  await claimUnassignedTeamsForSessionIfSingleAtlOrg(session.id);

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

  const teamCol = await teamAnalystTeamLeadColumnExists();

  const mtl = teamCol
    ? await dbQueryOne<{
        id: string;
        name: string;
        teamId: string;
        teamName: string;
        analystTeamLeadId: string | null;
      }>(
        `SELECT u.id, u.name, t.id AS "teamId", t.name AS "teamName", t."analystTeamLeadId"
     FROM "User" u
     INNER JOIN "Team" t ON t."mainTeamLeadId" = u.id
     WHERE u.id = $1 AND u.role = $2`,
        [mainTeamLeadId, UserRole.MAIN_TEAM_LEAD],
      )
    : await dbQueryOne<{
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
  if (
    teamCol &&
    "analystTeamLeadId" in mtl &&
    mtl.analystTeamLeadId != null &&
    mtl.analystTeamLeadId !== session.id
  ) {
    return {
      error:
        "You can only assign via main team leads that belong to your team directory.",
    };
  }

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
  revalidatePath("/analyst-team-lead/qualified-pipeline");
  revalidatePath("/team-lead");
  revalidatePath("/team-lead/leads");
  revalidatePath("/team-lead/reports");
  revalidatePath("/executive");
  revalidatePath("/analyst");
  return { ok: true as const };
}

/** On-demand export: called from client when user clicks Export, not on every page load. */
export async function fetchAtlLeadsExportAction(params: {
  from: string | null;
  to: string | null;
  status: string | null;
  analystId: string | null;
  source: string | null;
  website?: string | null;
  q: string | null;
}): Promise<{ ok: true; rows: PortalAtlLeadExportRow[] } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== UserRole.ANALYST_TEAM_LEAD) {
    return { ok: false, error: "Unauthorized." };
  }

  const analysts = await dbQuery<{ id: string }>(
    `SELECT id FROM "User" WHERE "managerId" = $1 AND role = $2`,
    [session.id, UserRole.LEAD_ANALYST],
  );
  const analystIds = analysts.map((a) => a.id);
  if (analystIds.length === 0) return { ok: true, rows: [] };

  const statusFilter =
    params.status === QualificationStatus.QUALIFIED ||
    params.status === QualificationStatus.NOT_QUALIFIED ||
    params.status === QualificationStatus.IRRELEVANT
      ? params.status
      : null;

  const analystIdFilter =
    params.analystId && analystIds.includes(params.analystId) ? params.analystId : null;

  const sourceFilter =
    params.source && params.source.length > 0 && params.source.length <= 256
      ? params.source
      : null;

  const websiteFilter =
    params.website &&
    params.website.length > 0 &&
    params.website.length <= 256
      ? params.website
      : null;

  const { clause, params: sqlParams } = atlLeadSql(
    analystIds,
    params.from,
    params.to,
    {
      qualificationStatus: statusFilter,
      createdById: analystIdFilter,
      source: sourceFilter,
      sourceWebsiteName: websiteFilter,
      q: params.q,
    },
    "l",
  );

  const exportLeadRows = await fetchAtlLeadsExportRows(clause, sqlParams, PORTAL_LEADS_EXPORT_ROW_CAP);
  const timeline = await fetchAtlRoutingTimelines(exportLeadRows.map((l) => l.id));

  const rows: PortalAtlLeadExportRow[] = exportLeadRows.map((l) => {
    const t = timeline.get(l.id);
    return {
      leadName: l.leadName,
      phone: l.phone,
      leadEmail: l.leadEmail,
      source: l.source,
      portalWebsite: l.portalWebsite,
      notes: l.notes,
      lostNotes: l.lostNotes,
      qualificationStatus: l.qualificationStatus,
      leadScore: l.leadScore,
      salesStage: l.salesStage,
      createdAt: l.createdAt.toISOString(),
      analystName: l.cb_name ?? "Unknown analyst",
      teamName: l.team_name,
      mtlName: l.mtl_name,
      repName: l.se_name,
      routedToMainTeamAt: t?.routedToMainTeamAt?.toISOString() ?? null,
      assignedToExecutiveAt: t?.assignedToExecutiveAt?.toISOString() ?? null,
      directAssignedToExecutiveByAtlAt: t?.directAssignedToExecutiveByAtlAt?.toISOString() ?? null,
    };
  });

  return { ok: true, rows };
}

export async function atlSetManagedMemberPassword(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ANALYST_TEAM_LEAD) {
    return { error: "Unauthorized." };
  }

  await claimUnassignedTeamsForSessionIfSingleAtlOrg(session.id);

  const userId = String(formData.get("userId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!userId || !password) {
    return { error: "User and password are required." };
  }

  const ownAnalyst = await dbQueryOne<{ one: number }>(
    `SELECT 1 AS one FROM "User"
     WHERE id = $1 AND role = $2 AND "managerId" = $3`,
    [userId, UserRole.LEAD_ANALYST, session.id],
  );

  const teamCol = await teamAnalystTeamLeadColumnExists();

  const ownMtl =
    !ownAnalyst &&
    (teamCol
      ? await dbQueryOne<{ one: number }>(
          `SELECT 1 AS one FROM "Team"
       WHERE "mainTeamLeadId" = $1 AND "analystTeamLeadId" = $2`,
          [userId, session.id],
        )
      : await dbQueryOne<{ one: number }>(
          `SELECT 1 AS one FROM "Team" WHERE "mainTeamLeadId" = $1`,
          [userId],
        ));

  if (!ownAnalyst && !ownMtl) {
    return {
      error:
        "You can only set passwords for lead analysts you manage or main team leads in your directory.",
    };
  }

  const synced = await syncUserPasswordWithAuth({ userId, password });
  if ("error" in synced) return synced;

  revalidatePath("/analyst-team-lead/team");
  return { ok: true as const, password: synced.password };
}

export async function atlSetManagedMemberPasswordFormAction(
  _prev: { error?: string; password?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; password?: string } | undefined> {
  const r = await atlSetManagedMemberPassword(formData);
  if (r && "error" in r) return { error: r.error };
  if (r && "ok" in r && r.ok && "password" in r) return { password: r.password };
  return undefined;
}
