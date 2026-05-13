/**
 * Runs once when the Node.js runtime starts (not during static page build).
 * Use for production sanity checks — avoid throwing (would break deploy).
 */
export function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (process.env.NODE_ENV !== "production") {
    if (!supabaseUrl || !supabaseAnon) {
      console.warn(
        "[LeadFlow] Dev: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing — session and login will not work.",
      );
    }
    if (!serviceKey) {
      console.warn(
        "[LeadFlow] Dev: SUPABASE_SERVICE_ROLE_KEY missing — server SQL (dbQuery / exec_sql RPC) will throw when loading data.",
      );
    }
    return;
  }

  if (!supabaseUrl || !supabaseAnon) {
    console.warn(
      "[LeadFlow] Production: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing — authentication will not work.",
    );
  }

  if (!serviceKey) {
    console.warn(
      "[LeadFlow] Production: SUPABASE_SERVICE_ROLE_KEY missing — server-side data access and admin operations will fail.",
    );
  }
}
