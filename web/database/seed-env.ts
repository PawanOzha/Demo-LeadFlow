import { assertDatabaseUrlConfigured } from "../src/lib/db/pool";
import type { PoolConfig } from "pg";

export function assertPostgresDatabaseUrl(): void {
  const url = (process.env.DATABASE_URL ?? "").trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is empty. In web/.env set it to your Supabase Postgres URI (Dashboard → Project Settings → Database → URI, port 5432).",
    );
  }
  assertDatabaseUrlConfigured(url);
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    const hint = url.startsWith("file:")
      ? "Remove SQLite file: URLs — this project uses PostgreSQL only."
      : "Use a connection string that starts with postgresql:// or postgres://.";
    throw new Error(`DATABASE_URL is not PostgreSQL. ${hint}`);
  }
}

export function pgConfigFromEnv(): PoolConfig {
  const url = (process.env.DATABASE_URL ?? "").trim();
  const config: PoolConfig = { connectionString: url };

  // Supabase requires TLS. Explicit ssl config avoids runtime differences where
  // URI sslmode is not honored consistently by node-postgres.
  if (/supabase\.co|pooler\.supabase\.com/i.test(url)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}
