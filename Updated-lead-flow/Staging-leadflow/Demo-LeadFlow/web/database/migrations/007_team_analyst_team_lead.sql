-- Which Analyst Team Lead created / owns this main sales team (MTL directory + password scope).
-- Existing rows keep analystTeamLeadId NULL until backfilled; ATL UI hides those teams until then.
-- Example: UPDATE "Team" SET "analystTeamLeadId" = '<analyst_team_lead_user_id>' WHERE id = '<team_id>';
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "analystTeamLeadId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Team_analystTeamLeadId_fkey'
  ) THEN
    ALTER TABLE "Team"
      ADD CONSTRAINT "Team_analystTeamLeadId_fkey"
      FOREIGN KEY ("analystTeamLeadId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Team_analystTeamLeadId_idx" ON "Team"("analystTeamLeadId");
