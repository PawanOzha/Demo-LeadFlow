import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

type EnvMap = Record<string, string>;

function readEnv(path: string): EnvMap {
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

function normalizeRows(data: unknown): Array<Record<string, unknown>> {
  if (typeof data === "string") {
    const parsed = JSON.parse(data) as unknown;
    if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>;
    return [];
  }
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object" && "rows" in data) {
    const rows = (data as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>;
  }
  return [];
}

async function main() {
  const env = readEnv(".env");
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  const rpcName = env.SUPABASE_SQL_RPC_NAME || "exec_sql";
  if (!url || !serviceRole) {
    throw new Error("Missing Supabase URL or service key in .env");
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function sql(
    label: string,
    queryText: string,
    queryParams: unknown[] = [],
  ) {
    const { data, error } = await supabase.rpc(rpcName, {
      query_text: queryText,
      query_params: queryParams,
    });
    if (error) {
      throw new Error(`${label} failed: ${error.message}`);
    }
    const rows = normalizeRows(data);
    return { label, rows };
  }

  const checks = await Promise.all([
    sql("total_leads", `SELECT COUNT(*)::bigint AS c FROM "Lead"`),
    sql(
      "sample_page_1",
      `SELECT id, "createdAt" FROM "Lead" ORDER BY "createdAt" DESC, id DESC LIMIT 25 OFFSET 0`,
    ),
    sql(
      "sample_page_2",
      `SELECT id, "createdAt" FROM "Lead" ORDER BY "createdAt" DESC, id DESC LIMIT 25 OFFSET 25`,
    ),
    sql(
      "search_count_name",
      `SELECT COUNT(*)::bigint AS c FROM "Lead" WHERE COALESCE("leadName",'') ILIKE $1`,
      ["%a%"],
    ),
    sql(
      "status_count_qualified",
      `SELECT COUNT(*)::bigint AS c FROM "Lead" WHERE "qualificationStatus" = $1`,
      ["QUALIFIED"],
    ),
    sql(
      "source_count_nonempty",
      `SELECT COUNT(*)::bigint AS c FROM "Lead" WHERE COALESCE(source,'') <> ''`,
    ),
    sql(
      "lead_count_with_analyst",
      `SELECT COUNT(*)::bigint AS c FROM "Lead" WHERE "createdById" IS NOT NULL`,
    ),
    sql(
      "lead_count_with_mtl",
      `SELECT COUNT(*)::bigint AS c FROM "Lead" WHERE "assignedMainTeamLeadId" IS NOT NULL`,
    ),
    sql(
      "lead_count_with_exec",
      `SELECT COUNT(*)::bigint AS c FROM "Lead" WHERE "assignedSalesExecId" IS NOT NULL`,
    ),
    sql(
      "user_role_distribution",
      `SELECT role, COUNT(*)::bigint AS c
       FROM "User"
       GROUP BY role
       ORDER BY c DESC`,
    ),
    sql(
      "top_analysts_by_leads",
      `SELECT u.name, u.email, COUNT(*)::bigint AS c
       FROM "Lead" l
       JOIN "User" u ON u.id = l."createdById"
       GROUP BY u.id, u.name, u.email
       ORDER BY c DESC
       LIMIT 5`,
    ),
    sql(
      "top_execs_by_leads",
      `SELECT u.name, u.email, COUNT(*)::bigint AS c
       FROM "Lead" l
       JOIN "User" u ON u.id = l."assignedSalesExecId"
       GROUP BY u.id, u.name, u.email
       ORDER BY c DESC
       LIMIT 5`,
    ),
    sql(
      "explain_base_page",
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
       SELECT id, "createdAt" FROM "Lead"
       ORDER BY "createdAt" DESC, id DESC
       LIMIT 25 OFFSET 0`,
    ),
    sql(
      "explain_filtered",
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
       SELECT id, "createdAt" FROM "Lead"
       WHERE "qualificationStatus" = $1
         AND COALESCE("leadName",'') ILIKE $2
       ORDER BY "createdAt" DESC, id DESC
       LIMIT 25 OFFSET 0`,
      ["QUALIFIED", "%a%"],
    ),
  ]);

  for (const check of checks) {
    console.log(`\n=== ${check.label} ===`);
    if (check.label.startsWith("explain_")) {
      if (check.rows.length === 0) {
        console.log("(no explain rows returned by RPC)");
        continue;
      }
      for (const row of check.rows) {
        const planLine =
          row["QUERY PLAN"] ??
          row["query_plan"] ??
          row["plan"] ??
          Object.values(row)[0];
        if (typeof planLine === "string" && planLine.length > 0) {
          console.log(planLine);
        } else {
          console.log(JSON.stringify(row));
        }
      }
      continue;
    }
    console.log(JSON.stringify(check.rows.slice(0, 5), null, 2));
  }

  const p1 = checks.find((c) => c.label === "sample_page_1")?.rows ?? [];
  const p2 = checks.find((c) => c.label === "sample_page_2")?.rows ?? [];
  const idSet = new Set(p1.map((r) => String(r.id)));
  const overlap = p2.filter((r) => idSet.has(String(r.id))).length;
  console.log(`\n=== pagination_overlap_page1_page2 ===`);
  console.log(overlap);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
