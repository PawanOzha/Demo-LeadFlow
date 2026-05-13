-- Backfill defensive indexes used by role-scoped lead listing filters.
-- Keep idempotent: IF NOT EXISTS on every index.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Primary lookup / role scope
CREATE INDEX IF NOT EXISTS idx_lead_created_by
  ON "Lead" ("createdById");
CREATE INDEX IF NOT EXISTS idx_lead_team_id
  ON "Lead" ("teamId");
CREATE INDEX IF NOT EXISTS idx_lead_assigned_exec
  ON "Lead" ("assignedSalesExecId");
CREATE INDEX IF NOT EXISTS idx_lead_assigned_mtl
  ON "Lead" ("assignedMainTeamLeadId");

-- Filter columns
CREATE INDEX IF NOT EXISTS idx_lead_status
  ON "Lead" ("qualificationStatus");
CREATE INDEX IF NOT EXISTS idx_lead_sales_stage
  ON "Lead" ("salesStage");
CREATE INDEX IF NOT EXISTS idx_lead_country
  ON "Lead" ("country");
CREATE INDEX IF NOT EXISTS idx_lead_source
  ON "Lead" ("source");

-- Sort/range columns
CREATE INDEX IF NOT EXISTS idx_lead_created_at_desc
  ON "Lead" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_lead_exec_assigned_at
  ON "Lead" ("execAssignedAt");
CREATE INDEX IF NOT EXISTS idx_lead_closed_at
  ON "Lead" ("closedAt");

-- Common filter combinations
CREATE INDEX IF NOT EXISTS idx_lead_created_by_status
  ON "Lead" ("createdById", "qualificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_lead_team_stage
  ON "Lead" ("teamId", "salesStage", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_lead_exec_stage
  ON "Lead" ("assignedSalesExecId", "salesStage", "createdAt" DESC);

-- Search acceleration (ILIKE name/email/phone)
CREATE INDEX IF NOT EXISTS idx_lead_name_trgm
  ON "Lead" USING GIN (lower(COALESCE("leadName", '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lead_email_trgm
  ON "Lead" USING GIN (lower(COALESCE("leadEmail", '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lead_phone_trgm
  ON "Lead" USING GIN (lower(COALESCE("phone", '')) gin_trgm_ops);

-- User table
CREATE INDEX IF NOT EXISTS idx_user_role
  ON "User" ("role");
CREATE INDEX IF NOT EXISTS idx_user_manager
  ON "User" ("managerId");
CREATE INDEX IF NOT EXISTS idx_user_team
  ON "User" ("teamId");

-- Notification unread fanout
CREATE INDEX IF NOT EXISTS idx_notif_recipient_unread
  ON "Notification" ("recipientId")
  WHERE "read" = false;
