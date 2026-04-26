import { assertDatabaseUrlConfigured } from "../src/lib/db/pool";

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
