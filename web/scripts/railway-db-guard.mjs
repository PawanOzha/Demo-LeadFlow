/**
 * Fast check before `next start` on Railway — does not run migrations.
 * Migrations run in `postbuild` via ensure-database.mjs so the HTTP server starts quickly.
 */
const dbUrl = (process.env.DATABASE_URL ?? "").trim();

if (process.env.RAILWAY_ENVIRONMENT) {
  if (!dbUrl) {
    console.error(
      "[LeadFlow] DATABASE_URL is not set. Railway → your service → Variables → add DATABASE_URL (Supabase Postgres URI, postgresql://...).",
    );
    process.exit(1);
  }
  if (dbUrl.startsWith("file:")) {
    console.error(
      "[LeadFlow] DATABASE_URL on Railway must be PostgreSQL (Supabase), not SQLite (file:...).",
    );
    console.error(
      "  Railway → Variables → set DATABASE_URL to postgresql://... from Supabase (port 5432).",
    );
    process.exit(1);
  }
  if (
    !dbUrl.startsWith("postgres://") &&
    !dbUrl.startsWith("postgresql://")
  ) {
    console.error(
      "[LeadFlow] DATABASE_URL must start with postgres:// or postgresql://",
    );
    process.exit(1);
  }
}
