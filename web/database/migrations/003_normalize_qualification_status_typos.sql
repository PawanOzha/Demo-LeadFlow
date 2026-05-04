-- Normalize legacy misspellings in "Lead"."qualificationStatus" so counts match
-- QualificationStatus in web/src/lib/constants.ts (QUALIFIED, NOT_QUALIFIED, IRRELEVANT).
--
-- Run once in Supabase → SQL Editor (or psql). Table name is "Lead" (singular), not "Leads".
-- Confirm bad values first:
--   SELECT "qualificationStatus", COUNT(*) FROM "Lead" GROUP BY 1 ORDER BY 2 DESC;

BEGIN;

UPDATE "Lead"
SET
  "qualificationStatus" = 'QUALIFIED',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "qualificationStatus" = 'QULIFIED';

UPDATE "Lead"
SET
  "qualificationStatus" = 'IRRELEVANT',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "qualificationStatus" = 'IRRELEVENT';

COMMIT;

-- After run, expect only canonical values (and any other typos you must fix separately):
--   SELECT "qualificationStatus", COUNT(*) FROM "Lead" GROUP BY 1 ORDER BY 2 DESC;
