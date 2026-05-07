-- LeadFlow migrated data integrity audit + safe reconciliation.
-- Scope: user/team linkage and lead assignment linkage.
-- Safety: updates are idempotent and only fill missing links.

BEGIN;

-- 1) AUDIT SNAPSHOT (before)
SELECT
  (SELECT COUNT(*) FROM "User" u WHERE u.role = 'MAIN_TEAM_LEAD' AND u."teamId" IS NULL) AS mtl_without_team,
  (SELECT COUNT(*) FROM "Lead" l WHERE l."assignedSalesExecId" IS NOT NULL AND l."teamId" IS NULL) AS exec_assigned_lead_without_team,
  (SELECT COUNT(*) FROM "Lead" l WHERE l."teamId" IS NOT NULL AND l."assignedMainTeamLeadId" IS NULL) AS team_lead_without_mtl;

-- 2) USER RECONCILIATION
-- Ensure each main team lead has the team linked from Team.mainTeamLeadId.
UPDATE "User" u
SET
  "teamId" = t.id,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Team" t
WHERE t."mainTeamLeadId" = u.id
  AND u.role = 'MAIN_TEAM_LEAD'
  AND (u."teamId" IS NULL OR u."teamId" <> t.id);

-- 3) LEAD RECONCILIATION (safe null-fill only)
-- Fill missing lead.teamId from the assigned sales executive's team.
UPDATE "Lead" l
SET
  "teamId" = se."teamId",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "User" se
WHERE l."assignedSalesExecId" = se.id
  AND l."teamId" IS NULL
  AND se."teamId" IS NOT NULL;

-- Fill missing lead.assignedMainTeamLeadId from Team.mainTeamLeadId.
UPDATE "Lead" l
SET
  "assignedMainTeamLeadId" = t."mainTeamLeadId",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Team" t
WHERE l."teamId" = t.id
  AND l."assignedMainTeamLeadId" IS NULL
  AND t."mainTeamLeadId" IS NOT NULL;

-- 4) AUDIT SNAPSHOT (after)
SELECT
  (SELECT COUNT(*) FROM "User" u WHERE u.role = 'MAIN_TEAM_LEAD' AND u."teamId" IS NULL) AS mtl_without_team,
  (SELECT COUNT(*) FROM "Lead" l WHERE l."assignedSalesExecId" IS NOT NULL AND l."teamId" IS NULL) AS exec_assigned_lead_without_team,
  (SELECT COUNT(*) FROM "Lead" l WHERE l."teamId" IS NOT NULL AND l."assignedMainTeamLeadId" IS NULL) AS team_lead_without_mtl;

COMMIT;
