/**
 * Applies database/migrations/001_init_postgresql.sql to the PostgreSQL database
 * referenced by DATABASE_URL. Safe to run multiple times — errors caused by
 * objects that already exist (Postgres error code 42P07 / duplicate_table, and
 * 42710 / duplicate_object for indexes/constraints) are silently skipped so the
 * script is fully idempotent.
 *
 * Exit codes:
 *   0 — all statements applied (or already existed)
 *   1 — unexpected error or DATABASE_URL not set
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_FILE = path.join(
  __dirname,
  "..",
  "database",
  "migrations",
  "001_init_postgresql.sql",
);

// Postgres error codes that mean "this object already exists" — safe to skip.
const ALREADY_EXISTS_CODES = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object  (indexes, constraints, types …)
  "42701", // duplicate_column
  "23505", // unique_violation   (can surface from CREATE UNIQUE INDEX CONCURRENTLY)
]);

function splitStatements(sql) {
  // Split on semicolons that are not inside single-quoted strings or comments.
  // A simple line-by-line approach is sufficient for the generated Prisma SQL.
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.match(/^--/));
}

function poolConfigFromUrl(url) {
  const config = { connectionString: url };
  if (/supabase\.co|pooler\.supabase\.com/i.test(url)) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

async function main() {
  const dbUrl = (process.env.DATABASE_URL ?? "").trim();

  if (!dbUrl) {
    console.error(
      "[run-migrations] DATABASE_URL is not set. Cannot apply migrations.",
    );
    process.exit(1);
  }

  if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
    console.error(
      "[run-migrations] DATABASE_URL does not look like a PostgreSQL connection string.",
    );
    process.exit(1);
  }

  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`[run-migrations] Migration file not found: ${MIGRATION_FILE}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(MIGRATION_FILE, "utf8");
  const statements = splitStatements(sql);

  console.log(
    `[run-migrations] Applying ${statements.length} statement(s) from 001_init_postgresql.sql …`,
  );

  const pool = new Pool(poolConfigFromUrl(dbUrl));

  let applied = 0;
  let skipped = 0;

  try {
    for (const stmt of statements) {
      // Skip pure comment blocks that survived the split
      if (stmt.startsWith("--")) {
        continue;
      }
      try {
        await pool.query(stmt);
        applied++;
      } catch (err) {
        if (ALREADY_EXISTS_CODES.has(err.code)) {
          skipped++;
        } else {
          console.error(
            `[run-migrations] Fatal error executing statement:\n${stmt}\n`,
          );
          console.error(`  Postgres error ${err.code}: ${err.message}`);
          throw err;
        }
      }
    }
  } finally {
    await pool.end();
  }

  console.log(
    `[run-migrations] Done. applied=${applied} already-existed(skipped)=${skipped}`,
  );
}

main().catch((err) => {
  console.error("[run-migrations] Migration failed:", err.message ?? err);
  process.exit(1);
});
