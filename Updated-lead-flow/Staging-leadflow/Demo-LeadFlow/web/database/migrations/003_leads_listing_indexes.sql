-- Additional indexes for large lead-list filters, sorting, and duplicate-phone scans.
-- NOTE: In production, prefer CREATE INDEX CONCURRENTLY via SQL editor/deployment runbook.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Lead_createdById_createdAt_id_idx"
  ON "Lead" ("createdById", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Lead_assignedMainTeamLeadId_createdAt_id_idx"
  ON "Lead" ("assignedMainTeamLeadId", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Lead_updatedAt_id_idx"
  ON "Lead" ("updatedAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Lead_source_createdAt_id_idx"
  ON "Lead" ("source", "createdAt" DESC, id DESC);

CREATE INDEX IF NOT EXISTS "Lead_phone_digits_expr_idx"
  ON "Lead" ((regexp_replace(COALESCE(phone, ''), '\D', '', 'g')));

CREATE INDEX IF NOT EXISTS "Lead_leadName_trgm_idx"
  ON "Lead" USING GIN (lower(COALESCE("leadName", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Lead_leadEmail_trgm_idx"
  ON "Lead" USING GIN (lower(COALESCE("leadEmail", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Lead_phone_trgm_idx"
  ON "Lead" USING GIN (lower(COALESCE(phone, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "LeadHandoffLog_createdAt_id_idx"
  ON "LeadHandoffLog" ("createdAt" DESC, id DESC);

ANALYZE "Lead";
ANALYZE "LeadHandoffLog";
