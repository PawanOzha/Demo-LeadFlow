-- Performance indexes for high-traffic dashboard and leads pages.
-- Safe to re-run: all indexes/functions use IF NOT EXISTS / OR REPLACE.

-- "Lead" table
CREATE INDEX IF NOT EXISTS "Lead_qualificationStatus_idx"
  ON "Lead"("qualificationStatus");

CREATE INDEX IF NOT EXISTS "Lead_salesStage_idx"
  ON "Lead"("salesStage");

CREATE INDEX IF NOT EXISTS "Lead_assignedSalesExecId_idx"
  ON "Lead"("assignedSalesExecId");

CREATE INDEX IF NOT EXISTS "Lead_teamId_idx"
  ON "Lead"("teamId");

CREATE INDEX IF NOT EXISTS "Lead_createdById_idx"
  ON "Lead"("createdById");

CREATE INDEX IF NOT EXISTS "Lead_createdAt_desc_idx"
  ON "Lead"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Lead_teamId_salesStage_idx"
  ON "Lead"("teamId", "salesStage");

CREATE INDEX IF NOT EXISTS "Lead_assignedSalesExecId_salesStage_idx"
  ON "Lead"("assignedSalesExecId", "salesStage");

CREATE INDEX IF NOT EXISTS "Lead_createdById_salesStage_idx"
  ON "Lead"("createdById", "salesStage");

CREATE INDEX IF NOT EXISTS "Lead_assignedSalesExecId_createdAt_desc_idx"
  ON "Lead"("assignedSalesExecId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Lead_createdAt_date_idx"
  ON "Lead"(DATE("createdAt"));

-- "User" table
CREATE INDEX IF NOT EXISTS "User_role_idx"
  ON "User"(role);

CREATE INDEX IF NOT EXISTS "User_teamId_idx"
  ON "User"("teamId");

CREATE INDEX IF NOT EXISTS "User_teamId_role_idx"
  ON "User"("teamId", role);

-- "LeadHandoffLog" table
CREATE INDEX IF NOT EXISTS "LeadHandoffLog_leadId_idx"
  ON "LeadHandoffLog"("leadId");

CREATE INDEX IF NOT EXISTS "LeadHandoffLog_createdAt_desc_idx"
  ON "LeadHandoffLog"("createdAt" DESC);

-- "Notification" table
CREATE INDEX IF NOT EXISTS "Notification_recipientId_idx"
  ON "Notification"("recipientId");

CREATE INDEX IF NOT EXISTS "Notification_unread_idx"
  ON "Notification"("recipientId", "read")
  WHERE "read" = false;

CREATE INDEX IF NOT EXISTS "Notification_createdAt_desc_idx"
  ON "Notification"("createdAt" DESC);

-- "SalesExecTeamTransfer" table
CREATE INDEX IF NOT EXISTS "SalesExecTeamTransfer_createdAt_desc_idx"
  ON "SalesExecTeamTransfer"("createdAt" DESC);

-- "Team" table
CREATE INDEX IF NOT EXISTS "Team_name_idx"
  ON "Team"(name);

-- RPC functions for single-round-trip dashboard stat cards.
CREATE OR REPLACE FUNCTION get_superadmin_stats()
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_leads',      (SELECT COUNT(*) FROM "Lead"),
    'qualified_leads',  (SELECT COUNT(*) FROM "Lead" WHERE "qualificationStatus" = 'QUALIFIED'),
    'not_qualified',    (SELECT COUNT(*) FROM "Lead" WHERE "qualificationStatus" = 'NOT_QUALIFIED'),
    'irrelevant_leads', (SELECT COUNT(*) FROM "Lead" WHERE "qualificationStatus" = 'IRRELEVANT'),
    'closed_won',       (SELECT COUNT(*) FROM "Lead" WHERE "salesStage" = 'CLOSED_WON'),
    'total_users',      (SELECT COUNT(*) FROM "User"),
    'total_teams',      (SELECT COUNT(*) FROM "Team")
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_team_stats(p_team_id TEXT)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'team_leads',       (SELECT COUNT(*) FROM "Lead" WHERE "teamId" = p_team_id),
    'with_exec',        (SELECT COUNT(*) FROM "Lead" WHERE "teamId" = p_team_id AND "salesStage" = 'WITH_EXECUTIVE'),
    'closed_won',       (SELECT COUNT(*) FROM "Lead" WHERE "teamId" = p_team_id AND "salesStage" = 'CLOSED_WON'),
    'team_members',     (SELECT COUNT(*) FROM "User" WHERE "teamId" = p_team_id)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_stats(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'my_leads',         (SELECT COUNT(*) FROM "Lead" WHERE "assignedSalesExecId" = p_user_id OR "createdById" = p_user_id),
    'with_exec',        (SELECT COUNT(*) FROM "Lead" WHERE "assignedSalesExecId" = p_user_id AND "salesStage" = 'WITH_EXECUTIVE'),
    'closed_won',       (SELECT COUNT(*) FROM "Lead" WHERE "assignedSalesExecId" = p_user_id AND "salesStage" = 'CLOSED_WON'),
    'closed_lost',      (SELECT COUNT(*) FROM "Lead" WHERE "assignedSalesExecId" = p_user_id AND "salesStage" = 'CLOSED_LOST')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
