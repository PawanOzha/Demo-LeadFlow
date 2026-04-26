/**
 * Demo data for PostgreSQL (Supabase). Requires DATABASE_URL=postgresql://...
 * and Supabase keys. Apply schema from `database/migrations/` first, then run:
 *   npx tsx database/seed.ts
 */
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { DEMO_PASSWORD, seedDemoWithAuthIds } from "./seed-demo-data";
import { assertPostgresDatabaseUrl } from "./seed-env";
import type { DemoAuthIds } from "./seed-demo-data";

assertPostgresDatabaseUrl();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAuthUser(email: string, password: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Seed requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (see web/.env.example).",
    );
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Supabase auth (${email}): ${error.message}`);
  if (!data.user?.id) throw new Error(`Supabase auth: no user id for ${email}`);
  return data.user.id;
}

async function main() {
  await pool.query(
    `TRUNCATE TABLE "LeadHandoffLog", "Lead", "Notification", "SalesExecTeamTransfer", "TeamWhatsApp", "Team", "User" CASCADE`,
  );

  const ids: DemoAuthIds = {
    superadmin: await createAuthUser("superadmin@demo.local", DEMO_PASSWORD),
    atl: await createAuthUser("atl@demo.local", DEMO_PASSWORD),
    analyst: await createAuthUser("analyst@demo.local", DEMO_PASSWORD),
    mtl: await createAuthUser("mtl@demo.local", DEMO_PASSWORD),
    exec1: await createAuthUser("exec1@demo.local", DEMO_PASSWORD),
    exec2: await createAuthUser("exec2@demo.local", DEMO_PASSWORD),
  };

  await seedDemoWithAuthIds(pool, ids);
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
