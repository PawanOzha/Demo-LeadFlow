import type { Pool, PoolClient } from "pg";
import { randomUUID } from "crypto";
import {
  QualificationStatus,
  SalesStage,
  UserRole,
} from "../src/lib/constants";

export const DEMO_PASSWORD = "password123";

export type DemoAuthIds = {
  superadmin: string;
  atl: string;
  analyst: string;
  mtl: string;
  exec1: string;
  exec2: string;
};

export async function seedBootstrapSuperAdminOnly(
  pool: Pool | PoolClient,
  superadminAuthId: string,
) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO "User" (id, email, "authUserId", name, role, "mustResetPassword", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      id,
      "superadmin@demo.local",
      superadminAuthId,
      "Super Admin",
      UserRole.SUPERADMIN,
    ],
  );
}

export async function seedDemoWithAuthIds(pool: Pool, ids: DemoAuthIds) {
  const superadminDbId = randomUUID();
  const atlId = randomUUID();
  const analystId = randomUUID();
  const mtlId = randomUUID();
  const teamId = randomUUID();
  const waId = randomUUID();
  const exec1DbId = randomUUID();
  const exec2DbId = randomUUID();

  await pool.query(
    `INSERT INTO "User" (id, email, "authUserId", name, role, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      superadminDbId,
      "superadmin@demo.local",
      ids.superadmin,
      "Super Admin",
      UserRole.SUPERADMIN,
    ],
  );

  await pool.query(
    `INSERT INTO "User" (id, email, "authUserId", name, role, "analystTeamName", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      atlId,
      "atl@demo.local",
      ids.atl,
      "Analyst Team Lead",
      UserRole.ANALYST_TEAM_LEAD,
      "Demo analyst org",
    ],
  );

  await pool.query(
    `INSERT INTO "User" (id, email, "authUserId", name, role, "managerId", "analystTeamName", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      analystId,
      "analyst@demo.local",
      ids.analyst,
      "Lead Analyst One",
      UserRole.LEAD_ANALYST,
      atlId,
      "Demo analyst team",
    ],
  );

  await pool.query(
    `INSERT INTO "User" (id, email, "authUserId", name, role, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      mtlId,
      "mtl@demo.local",
      ids.mtl,
      "Main Team Lead — Team Alpha",
      UserRole.MAIN_TEAM_LEAD,
    ],
  );

  await pool.query(
    `INSERT INTO "Team" (id, name, "mainTeamLeadId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [teamId, "Team Alpha", mtlId],
  );

  await pool.query(
    `INSERT INTO "TeamWhatsApp" (id, "teamId", phone, label, "sortOrder", "createdAt")
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
    [waId, teamId, "+1 555 0100", "Sales", 0],
  );

  await pool.query(
    `UPDATE "User" SET "teamId" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
    [teamId, mtlId],
  );

  await pool.query(
    `INSERT INTO "User" (id, email, "authUserId", name, role, "teamId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      exec1DbId,
      "exec1@demo.local",
      ids.exec1,
      "Sales Exec One",
      UserRole.SALES_EXECUTIVE,
      teamId,
    ],
  );

  await pool.query(
    `INSERT INTO "User" (id, email, "authUserId", name, role, "teamId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      exec2DbId,
      "exec2@demo.local",
      ids.exec2,
      "Sales Exec Two",
      UserRole.SALES_EXECUTIVE,
      teamId,
    ],
  );

  const deadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const l1 = randomUUID();
  await pool.query(
    `INSERT INTO "Lead" (
      id, "leadName", phone, "leadEmail", source, "qualificationStatus", "leadScore", "salesStage",
      "createdById", notes, "createdAt", "updatedAt", "internalReassignCount"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)`,
    [
      l1,
      "Demo Contact One",
      "+919876543210",
      "demo1@example.com",
      "Meta Ads / WhatsApp",
      QualificationStatus.QUALIFIED,
      78,
      SalesStage.PRE_SALES,
      analystId,
      "Enterprise SaaS inquiry",
    ],
  );

  const l2 = randomUUID();
  await pool.query(
    `INSERT INTO "Lead" (
      id, "leadName", phone, "leadEmail", source, "qualificationStatus", "leadScore", "salesStage",
      "createdById", "createdAt", "updatedAt", "internalReassignCount"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)`,
    [
      l2,
      "Demo Contact Two",
      null,
      "demo2@example.com",
      "Website / Forms / Chat",
      QualificationStatus.NOT_QUALIFIED,
      30,
      SalesStage.PRE_SALES,
      analystId,
    ],
  );

  const l3 = randomUUID();
  await pool.query(
    `INSERT INTO "Lead" (
      id, "leadName", phone, "leadEmail", source, "qualificationStatus", "leadScore", "salesStage",
      "createdById", "assignedMainTeamLeadId", "teamId", "createdAt", "updatedAt", "internalReassignCount"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)`,
    [
      l3,
      "Demo Contact Three",
      "+919123456789",
      null,
      "Meta Ads / WhatsApp",
      QualificationStatus.QUALIFIED,
      92,
      SalesStage.WITH_TEAM_LEAD,
      analystId,
      mtlId,
      teamId,
    ],
  );

  const l4 = randomUUID();
  await pool.query(
    `INSERT INTO "Lead" (
      id, "leadName", phone, "leadEmail", source, "qualificationStatus", "leadScore", "salesStage",
      "createdById", "assignedMainTeamLeadId", "teamId", "assignedSalesExecId", "execAssignedAt", "execDeadlineAt",
      "createdAt", "updatedAt", "internalReassignCount"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)`,
    [
      l4,
      "Demo Contact Four",
      "+919988776655",
      "demo4@example.com",
      "Downloads / Gated content",
      QualificationStatus.QUALIFIED,
      65,
      SalesStage.WITH_EXECUTIVE,
      analystId,
      mtlId,
      teamId,
      exec1DbId,
      now,
      deadline,
    ],
  );
}
