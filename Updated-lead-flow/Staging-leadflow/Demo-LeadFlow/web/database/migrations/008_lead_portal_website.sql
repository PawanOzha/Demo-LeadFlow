-- Optional portal / brand website (preset list from add-lead + import), distinct from source channel detail.
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "portalWebsite" TEXT;
