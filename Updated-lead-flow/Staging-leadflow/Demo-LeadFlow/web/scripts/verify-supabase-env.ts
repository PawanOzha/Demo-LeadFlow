import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnv(path: string): Record<string, string> {
  const raw = readFileSync(path, "utf8");
  const pairs = raw
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
      return [key, value] as const;
    });
  return Object.fromEntries(pairs);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1];
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const json = Buffer.from(padded + "=".repeat(padLen), "base64").toString(
    "utf8",
  );
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function main() {
  const env = readEnv(".env");
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let hostRef = "";
  try {
    hostRef = new URL(url).hostname.split(".")[0] ?? "";
  } catch {
    hostRef = "";
  }

  const anonPayload = decodeJwtPayload(anon);
  const servicePayload = decodeJwtPayload(service);
  const anonRef =
    typeof anonPayload?.ref === "string" ? anonPayload.ref : null;
  const serviceRef =
    typeof servicePayload?.ref === "string" ? servicePayload.ref : null;

  console.log("NEXT_PUBLIC_SUPABASE_URL host ref:", hostRef || "(invalid URL)");
  console.log("JWT ref (anon):", anonRef ?? "(missing)");
  console.log("JWT ref (service_role):", serviceRef ?? "(missing)");
  if (anonRef && hostRef && anonRef !== hostRef) {
    console.warn(
      "\n⚠️  Anon key project ref does not match URL hostname — wrong keys or wrong project.\n",
    );
  }
  if (serviceRef && hostRef && serviceRef !== hostRef) {
    console.warn(
      "\n⚠️  Service role key project ref does not match URL hostname.\n",
    );
  }
  if (anonRef && serviceRef && anonRef !== serviceRef) {
    console.warn(
      "\n⚠️  Anon and service_role JWT refs differ — keys are from different projects.\n",
    );
  }

  if (!url || !service) {
    console.error("Missing URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rpc = env.SUPABASE_SQL_RPC_NAME || "exec_sql";
  const { data, error } = await supabase.rpc(rpc, {
    query_text: `SELECT COUNT(*)::text AS c FROM "Lead"`,
    query_params: [],
  });
  if (error) {
    console.error("RPC error:", error.message);
    process.exit(1);
  }
  const rows =
    typeof data === "string"
      ? JSON.parse(data)
      : Array.isArray(data)
        ? data
        : (data as { rows?: unknown })?.rows ?? [];
  console.log('COUNT(*) FROM "Lead":', (rows as { c?: string }[])[0]?.c);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
