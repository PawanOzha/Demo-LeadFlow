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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.warn(
      "[LeadFlow] Production: SUPABASE_SERVICE_ROLE_KEY missing — server-side data access and admin operations will fail.",
    );
  }
}
