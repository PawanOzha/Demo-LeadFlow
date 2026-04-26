/**
 * One-time bootstrap when the app database has no users (e.g. fresh Railway deploy).
 * Creates exactly one Supabase Auth user and one portal user: superadmin@demo.local.
 */
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { DEMO_PASSWORD, seedBootstrapSuperAdminOnly } from "./seed-demo-data";
import { assertPostgresDatabaseUrl } from "./seed-env";

async function getOrCreateAuthUser(email: string, password: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Bootstrap requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const normalized = email.trim().toLowerCase();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
  });
  if (!error && created.user?.id) return created.user.id;

  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) {
    throw new Error(`Supabase auth (${email}): ${listErr.message}`);
  }
  const found = listData.users?.find(
    (u) => (u.email ?? "").toLowerCase() === normalized,
  );
  if (found?.id) return found.id;

  throw new Error(
    error?.message ?? `Could not create or find Supabase auth user for ${email}`,
  );
}

async function main() {
  assertPostgresDatabaseUrl();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const quick = await pool.query(`SELECT COUNT(*)::int AS c FROM "User"`);
    if ((quick.rows[0] as { c: number }).c > 0) {
      console.log("[LeadFlow] bootstrap: users already exist, skipping.");
      return;
    }

    const superadminAuthId = await getOrCreateAuthUser(
      "superadmin@demo.local",
      DEMO_PASSWORD,
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT pg_advisory_xact_lock(41820319)`);
      const n = await client.query(`SELECT COUNT(*)::int AS c FROM "User"`);
      if ((n.rows[0] as { c: number }).c > 0) {
        await client.query("COMMIT");
        console.log(
          "[LeadFlow] bootstrap: another replica created users first; skipping.",
        );
        return;
      }
      await seedBootstrapSuperAdminOnly(client, superadminAuthId);
      await client.query("COMMIT");
      console.log(
        "[LeadFlow] bootstrap: superadmin created (superadmin@demo.local). Sign in with password from seed (default password123).",
      );
    } catch (e) {
      await client.query("ROLLBACK");
      const err = e as { code?: string };
      if (err.code === "23505") {
        console.log(
          "[LeadFlow] bootstrap: another replica created users first; skipping.",
        );
      } else {
        throw e;
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
