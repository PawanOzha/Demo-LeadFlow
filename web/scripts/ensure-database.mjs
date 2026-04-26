/**
 * Schema is managed as SQL under `database/migrations/` (apply via Supabase SQL editor or `psql`).
 * This script is kept for deploy hooks that expect a no-op after build/start when DATABASE_URL is unset.
 */
import process from "process";

const dbUrl = (process.env.DATABASE_URL ?? "").trim();

if (process.env.npm_lifecycle_event === "postbuild") {
  console.log(
    "[LeadFlow] postbuild — skipping DB checks (DATABASE_URL is usually injected at runtime).",
  );
  process.exit(0);
}

if (!dbUrl) {
  console.warn("[LeadFlow] DATABASE_URL is not set — skipping DB check.");
  process.exit(0);
}

if (dbUrl.startsWith("file:")) {
  console.warn(
    "[LeadFlow] DATABASE_URL uses file: (SQLite). Use postgresql:// from Supabase.",
  );
  process.exit(0);
}

if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
  console.warn("[LeadFlow] DATABASE_URL does not look like PostgreSQL — skipping.");
  process.exit(0);
}

console.log(
  "[LeadFlow] DATABASE_URL is set (PostgreSQL). Apply migrations from web/database/migrations/ if needed.",
);
process.exit(0);
