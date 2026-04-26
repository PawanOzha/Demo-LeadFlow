import { Pool, type PoolClient, type PoolConfig } from "pg";

const globalForPool = globalThis as unknown as { __leadflowPgPool?: Pool };

/** Fail fast when .env still has a template password (common cause of “can’t connect”). */
export function assertDatabaseUrlConfigured(connectionString: string): void {
  const u = connectionString.trim();
  if (/CHANGE_ME/i.test(u)) {
    throw new Error(
      'DATABASE_URL still contains "CHANGE_ME" — replace it with your real database password from Supabase → Project Settings → Database. Use "Copy connection string" (URI) so the password is embedded correctly, or URL-encode special characters in the password.',
    );
  }
  if (/\[YOUR-PASSWORD\]/i.test(u) || /\[YOUR-PROJECT-REF\]/i.test(u)) {
    throw new Error(
      "DATABASE_URL still contains template placeholders from .env.example — paste your full Supabase Postgres URI from the dashboard.",
    );
  }
}

function normalizeConnectionString(url: string): string {
  const u = new URL(url.trim());
  let out = u.toString();
  const isPooler =
    /pooler\.supabase\.com/i.test(out) || /:6543(\/|\?|$)/.test(out);
  if (isPooler && !/[?&]pgbouncer=true/i.test(out)) {
    out += out.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
  }
  if (/supabase\.co|pooler\.supabase\.com/i.test(out)) {
    // Keep TLS behavior under explicit `ssl` config below. Leaving sslmode in
    // URL can be interpreted as verify-full by pg/pg-connection-string.
    u.searchParams.delete("sslmode");
    u.searchParams.delete("sslrootcert");
    u.searchParams.delete("sslcert");
    u.searchParams.delete("sslkey");
    u.searchParams.delete("sslcrl");
    out = u.toString();
  }
  return out;
}

function poolConfigFromUrl(connectionString: string): PoolConfig {
  const base: PoolConfig = {
    connectionString,
    max: 15,
    connectionTimeoutMillis: 15_000,
  };
  // Supabase Postgres requires TLS. `pg` does not always apply sslmode from the URI
  // the same way other clients do; missing TLS often surfaces as a generic connection failure.
  if (/supabase\.co|pooler\.supabase\.com/i.test(connectionString)) {
    base.ssl = { rejectUnauthorized: false };
  }
  return base;
}

export function getPool(): Pool {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is required.");
  }
  assertDatabaseUrlConfigured(raw);
  const url = normalizeConnectionString(raw);
  if (!globalForPool.__leadflowPgPool) {
    globalForPool.__leadflowPgPool = new Pool(poolConfigFromUrl(url));
  }
  return globalForPool.__leadflowPgPool;
}

/** Run a query; returns all rows. */
export async function dbQuery<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

/** Single row or null. */
export async function dbQueryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await dbQuery<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export function newId(): string {
  return crypto.randomUUID();
}
