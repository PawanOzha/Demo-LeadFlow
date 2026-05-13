-- Dashboard / cron performance (idempotent).
-- Overlap: 002/003/004 already index Lead(updatedAt, id), assignedMainTeamLeadId+createdAt,
-- qualificationStatus, salesStage, createdById, assignedSalesExecId, etc.

-- Deadline sweep (`deadline.ts`): filter by team + stage + non-null past deadline
CREATE INDEX IF NOT EXISTS "Lead_teamId_salesStage_execDeadlineAt_idx"
  ON "Lead" ("teamId", "salesStage")
  WHERE "execDeadlineAt" IS NOT NULL;

ANALYZE "Lead";
