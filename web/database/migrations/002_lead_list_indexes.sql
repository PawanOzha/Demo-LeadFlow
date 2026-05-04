-- Speed up portal list queries, filters, and sorts on large Lead tables.
-- Run after 001. In production, prefer CONCURRENTLY if the table is huge and locked.

CREATE INDEX IF NOT EXISTS "Lead_createdById_createdAt_idx"
  ON "Lead" ("createdById", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx"
  ON "Lead" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Lead_updatedAt_idx"
  ON "Lead" ("updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "Lead_teamId_idx"
  ON "Lead" ("teamId");

CREATE INDEX IF NOT EXISTS "Lead_qualificationStatus_idx"
  ON "Lead" ("qualificationStatus");

CREATE INDEX IF NOT EXISTS "Lead_assignedSalesExecId_idx"
  ON "Lead" ("assignedSalesExecId");
