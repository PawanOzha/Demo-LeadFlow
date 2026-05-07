-- LeadFlow filter/query performance indexes
-- Run once in Supabase SQL editor (or via psql) in production.

BEGIN;

-- Needed for fast ILIKE '%...%' on text fields.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Core role-scoped + date-range filters.
CREATE INDEX IF NOT EXISTS "Lead_createdById_createdAt_idx"
  ON "Lead" ("createdById", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Lead_createdById_createdAt_id_idx"
  ON "Lead" ("createdById", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Lead_assignedMainTeamLeadId_createdAt_idx"
  ON "Lead" ("assignedMainTeamLeadId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Lead_assignedMainTeamLeadId_createdAt_id_idx"
  ON "Lead" ("assignedMainTeamLeadId", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Lead_assignedSalesExecId_createdAt_idx"
  ON "Lead" ("assignedSalesExecId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Lead_assignedSalesExecId_createdAt_id_idx"
  ON "Lead" ("assignedSalesExecId", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Lead_createdAt_id_idx"
  ON "Lead" ("createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Lead_updatedAt_id_idx"
  ON "Lead" ("updatedAt" DESC, id DESC);

-- Superadmin cross-role filters.
CREATE INDEX IF NOT EXISTS "Lead_createdAt_status_team_exec_analyst_idx"
  ON "Lead" ("createdAt" DESC, "qualificationStatus", "teamId", "assignedSalesExecId", "createdById");

CREATE INDEX IF NOT EXISTS "Lead_source_idx"
  ON "Lead" ("source");

-- Search fields used by q filters.
CREATE INDEX IF NOT EXISTS "Lead_leadName_trgm_idx"
  ON "Lead" USING GIN (lower(COALESCE("leadName", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Lead_leadEmail_trgm_idx"
  ON "Lead" USING GIN (lower(COALESCE("leadEmail", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Lead_phone_trgm_idx"
  ON "Lead" USING GIN (lower(COALESCE(phone, '')) gin_trgm_ops);

-- Helps duplicate-phone checks and normalized phone matching.
CREATE INDEX IF NOT EXISTS "Lead_phone_digits_expr_idx"
  ON "Lead" ((regexp_replace(COALESCE(phone, ''), '\D', '', 'g')));

-- Dashboard and journey timeline pagination paths.
CREATE INDEX IF NOT EXISTS "LeadHandoffLog_createdAt_id_idx"
  ON "LeadHandoffLog" ("createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "LeadHandoffLog_leadId_createdAt_idx"
  ON "LeadHandoffLog" ("leadId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SalesExecTeamTransfer_createdAt_id_idx"
  ON "SalesExecTeamTransfer" ("createdAt" DESC, id DESC);

COMMIT;

ANALYZE "Lead";
ANALYZE "LeadHandoffLog";
ANALYZE "SalesExecTeamTransfer";
