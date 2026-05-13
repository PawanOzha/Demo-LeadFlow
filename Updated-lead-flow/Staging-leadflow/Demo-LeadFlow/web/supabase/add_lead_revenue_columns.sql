-- Run once in Supabase SQL Editor (adds Option C revenue fields).
ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "estimatedDealValue" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "closedRevenue" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "dealCurrency" TEXT NOT NULL DEFAULT 'USD';

COMMENT ON COLUMN "Lead"."estimatedDealValue" IS 'Optional pipeline estimate at lead creation (analyst).';
COMMENT ON COLUMN "Lead"."closedRevenue" IS 'Final revenue when closed won (sales executive).';
COMMENT ON COLUMN "Lead"."dealCurrency" IS 'ISO 4217 code for both estimates and closed revenue.';
