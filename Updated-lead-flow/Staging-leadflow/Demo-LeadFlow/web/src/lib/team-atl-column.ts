import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { UserRole } from "@/lib/constants";

/** Supabase / JSON-RPC may return booleans as strings. */
function coalesceExists(raw: unknown): boolean {
  if (raw === true) return true;
  if (raw === false) return false;
  if (typeof raw === "string") {
    const s = raw.toLowerCase();
    return s === "t" || s === "true" || s === "1";
  }
  return false;
}

/**
 * We only cache positive detection. Never caching `false` fixes dev/prod flows where
 * migration 007 is applied after the server first checked the catalogue: otherwise
 * `createMainTeamLeadAndTeam` could omit `analystTeamLeadId` while the Teams page
 * later filters on it, yielding an empty directory.
 */
let cachedTeamColumnExists = false;

/**
 * True when `"Team"."analystTeamLeadId"` exists (see `database/migrations/007_team_analyst_team_lead.sql`).
 */
export async function teamAnalystTeamLeadColumnExists(): Promise<boolean> {
  if (cachedTeamColumnExists) return true;
  const row = await dbQueryOne<{ exists: unknown }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Team'
        AND column_name = 'analystTeamLeadId'
    ) AS exists`,
  );
  const exists = coalesceExists(row?.exists);
  if (exists) cachedTeamColumnExists = true;
  return exists;
}

/** Single-tenant / demo org: exactly one analyst team lead row in `User`. */
export async function isSingleAnalystTeamLeadOrg(): Promise<boolean> {
  const row = await dbQueryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "User" WHERE role = $1`,
    [UserRole.ANALYST_TEAM_LEAD],
  );
  return Number(row?.c ?? 0) === 1;
}

/**
 * When the DB has exactly one ATL, assign unowned teams (`analystTeamLeadId` NULL)
 * to the signed-in ATL so directories and dropdowns repopulate after migration or
 * stale cache inserts. Safe to run repeatedly; no-op for multi-ATL orgs.
 */
export async function claimUnassignedTeamsForSessionIfSingleAtlOrg(
  analystTeamLeadUserId: string,
): Promise<void> {
  if (!(await teamAnalystTeamLeadColumnExists())) return;
  if (!(await isSingleAnalystTeamLeadOrg())) return;
  await dbQuery(
    `UPDATE "Team"
     SET "analystTeamLeadId" = $1, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "analystTeamLeadId" IS NULL`,
    [analystTeamLeadUserId],
  );
}
