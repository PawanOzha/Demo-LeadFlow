/**
 * Runs once when the Node.js runtime starts (not during static page build).
 * Use for production sanity checks — avoid throwing (would break deploy).
 */
export function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnon) {
    console.warn(
      "[LeadFlow] Production: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing — authentication will not work.",
    );
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl) {
    console.warn(
      "[LeadFlow] Production: DATABASE_URL is missing — the app cannot reach Postgres.",
    );
  } else if (
    !dbUrl.startsWith("postgres://") &&
    !dbUrl.startsWith("postgresql://")
  ) {
    if (dbUrl.startsWith("file:")) {
      console.error(
        "[LeadFlow] DATABASE_URL uses SQLite (file:). Hosted deploys (Railway, etc.) need postgresql:// from Supabase — set it in the host dashboard Variables.",
      );
    } else {
      console.warn(
        "[LeadFlow] Production: DATABASE_URL does not look like a PostgreSQL connection string.",
      );
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.warn(
      "[LeadFlow] Production: SUPABASE_SERVICE_ROLE_KEY missing — seed and admin user creation will fail.",
    );
  }
}
