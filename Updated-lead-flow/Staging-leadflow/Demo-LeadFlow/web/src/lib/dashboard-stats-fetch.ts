import { QualificationStatus, SalesStage } from "@/lib/constants";
import { ExecSqlShapeError } from "@/lib/db/exec-sql-errors";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { leadDashboardStatsSqlSchema } from "@/lib/lead-dashboard-stats-schema";
import type { ReportLeadDashRow } from "@/lib/report-joined-leads-fetch";
import { LEAD_DASH_COLUMNS } from "@/lib/report-joined-leads-fetch";
import { logLeadDashboardStatsSchemaMismatch } from "@/lib/server/log";

/** Max rows embedded in dashboard export “Lead snapshot” / detail tables (single round trip). */
export const DASHBOARD_EXPORT_SNAPSHOT_LIMIT = 2000;

export const DASHBOARD_PIPELINE_QUALIFIED_LIMIT = 200;
export const DASHBOARD_RECENT_LEADS_LIMIT = 6;

export type LeadDashboardThinRow = {
  phone: string | null;
  country: string | null;
  city: string | null;
  qualificationStatus: string;
  salesStage: string;
  source: string;
  sourceWebsiteName: string | null;
  sourceMetaProfileName: string | null;
};

type SqlLabelCount = { label: string; count: number };
type SqlStageCount = { stageKey: string; count: number };
type SqlAnalystAgg = {
  createdById: string;
  cbName: string;
  cbEmail: string;
  qualified: number;
  not_q: number;
  irrelevant: number;
};
type SqlExecAgg = {
  assignedSalesExecId: string | null;
  seName: string | null;
  assignedTotal: number;
  withRepOpen: number;
  closedWon: number;
  closedLost: number;
};
type SqlQualReason = { status: string; reason: string; count: number };
type SqlScoreBucket = { label: string; count: number };
type SqlTrendDay = { date: string; total: number; qualified: number; won: number };

export type SqlConvDimRow = { label: string; total: number; won: number };
/** Stored country + qualification splits (no phone parsing). */
export type SqlCountryQualRow = {
  label: string;
  q: number;
  nq: number;
  ir: number;
  total: number;
};
export type SqlCityCountRow = { label: string; count: number };

/** 1-based substring start after `Qualification reason:` (see `extractQualificationReason`). */
const QUAL_REASON_SUBSTR_FROM = "Qualification reason:".length + 1;

export type LeadDashboardStatsPayload = {
  total: number;
  qualified: number;
  not_q: number;
  irrelevant: number;
  closed_won: number;
  closed_lost: number;
  with_exec: number;
  with_team_lead: number;
  pre_sales: number;
  qualified_internal: number;
  qualified_passed: number;
  passed_with_tl: number;
  passed_with_exec: number;
  passed_won: number;
  passed_lost: number;
  avg_lead_score: number | null;
  by_source: SqlLabelCount[];
  by_stage: SqlStageCount[];
  lead_analysts: SqlAnalystAgg[];
  sales_execs: SqlExecAgg[];
  qual_reasons: SqlQualReason[];
  score_buckets: SqlScoreBucket[];
  daily_trend: SqlTrendDay[];
  /** Won ÷ leads per bucket from SQL — used when thin per-lead rows are unavailable. */
  conv_by_country_sql: SqlConvDimRow[];
  conv_by_source_sql: SqlConvDimRow[];
  conv_by_website_sql: SqlConvDimRow[];
  conv_by_meta_sql: SqlConvDimRow[];
  country_qual_sql: SqlCountryQualRow[];
  city_counts_sql: SqlCityCountRow[];
};

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string" && v.trim()) return Number(v) || 0;
  return 0;
}

function parseStatsRow(raw: unknown): LeadDashboardStatsPayload {
  const o = asObj(raw);
  if (!o) {
    throw new Error("lead dashboard stats: expected object row");
  }
  const arrObj = <T>(key: string): T[] => {
    const x = o[key];
    if (!Array.isArray(x)) return [];
    return x as T[];
  };
  return {
    total: num(o.total),
    qualified: num(o.qualified),
    not_q: num(o.not_q),
    irrelevant: num(o.irrelevant),
    closed_won: num(o.closed_won),
    closed_lost: num(o.closed_lost),
    with_exec: num(o.with_exec),
    with_team_lead: num(o.with_team_lead),
    pre_sales: num(o.pre_sales),
    qualified_internal: num(o.qualified_internal),
    qualified_passed: num(o.qualified_passed),
    passed_with_tl: num(o.passed_with_tl),
    passed_with_exec: num(o.passed_with_exec),
    passed_won: num(o.passed_won),
    passed_lost: num(o.passed_lost),
    avg_lead_score:
      o.avg_lead_score == null || o.avg_lead_score === ""
        ? null
        : Math.round(Number(o.avg_lead_score) * 10) / 10,
    by_source: arrObj<SqlLabelCount>("by_source"),
    by_stage: arrObj<SqlStageCount>("by_stage"),
    lead_analysts: arrObj<SqlAnalystAgg>("lead_analysts"),
    sales_execs: arrObj<SqlExecAgg>("sales_execs"),
    qual_reasons: arrObj<SqlQualReason>("qual_reasons"),
    score_buckets: arrObj<SqlScoreBucket>("score_buckets"),
    daily_trend: arrObj<SqlTrendDay>("daily_trend"),
    conv_by_country_sql: arrObj<SqlConvDimRow>("conv_by_country_sql"),
    conv_by_source_sql: arrObj<SqlConvDimRow>("conv_by_source_sql"),
    conv_by_website_sql: arrObj<SqlConvDimRow>("conv_by_website_sql"),
    conv_by_meta_sql: arrObj<SqlConvDimRow>("conv_by_meta_sql"),
    country_qual_sql: arrObj<SqlCountryQualRow>("country_qual_sql"),
    city_counts_sql: arrObj<SqlCityCountRow>("city_counts_sql"),
  };
}

function jsonIfObjectString(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return v;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return v;
  }
}

function statsFieldFromRecord(cur: Record<string, unknown>): unknown {
  if ("stats" in cur && cur.stats != null) return cur.stats;
  for (const key of Object.keys(cur)) {
    if (key.toLowerCase() === "stats") return cur[key];
  }
  return undefined;
}

function looksLikeLeadStatsAggregate(o: Record<string, unknown>): boolean {
  return (
    typeof o.total !== "undefined" ||
    Array.isArray(o.by_source) ||
    Array.isArray(o.by_stage) ||
    Array.isArray(o.lead_analysts) ||
    Array.isArray(o.daily_trend)
  );
}

/** Normalize JSON from `exec_sql` row wrappers (`stats` alias, PostgREST single-key envelope, flattened aggregate). */
function extractLeadDashboardStatsField(input: { stats?: unknown } | null): unknown {
  if (!input) return undefined;

  const materialized = jsonIfObjectString(input);
  if (!materialized || typeof materialized !== "object" || Array.isArray(materialized)) {
    return undefined;
  }

  let cur = materialized as Record<string, unknown>;

  for (let d = 0; d < 8; d += 1) {
    const direct = statsFieldFromRecord(cur);
    if (direct != null) return jsonIfObjectString(direct);

    if (looksLikeLeadStatsAggregate(cur)) return cur;

    const keys = Object.keys(cur);
    const execKey = keys.find((k) => /^(exec_sql(_batch_tx)?)$/i.test(k));
    if (
      execKey &&
      cur[execKey] &&
      typeof cur[execKey] === "object" &&
      !Array.isArray(cur[execKey])
    ) {
      cur = cur[execKey] as Record<string, unknown>;
      continue;
    }

    const rjKey = keys.find((k) => /^row_to_json$/i.test(k));
    if (
      rjKey &&
      cur[rjKey] &&
      (typeof cur[rjKey] === "object" || typeof cur[rjKey] === "string")
    ) {
      const inner = jsonIfObjectString(cur[rjKey]);
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        cur = inner as Record<string, unknown>;
        continue;
      }
    }

    if (keys.length === 1) {
      const k0 = keys[0]!;
      const inner = jsonIfObjectString(cur[k0]);
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        cur = inner as Record<string, unknown>;
        continue;
      }
    }

    let stepped = false;
    for (const k of keys) {
      const inner = jsonIfObjectString(cur[k]);
      if (!inner || typeof inner !== "object" || Array.isArray(inner)) continue;
      const next = inner as Record<string, unknown>;
      if (statsFieldFromRecord(next) != null || looksLikeLeadStatsAggregate(next)) {
        cur = next;
        stepped = true;
        break;
      }
    }
    if (stepped) continue;

    break;
  }

  const lastDirect = statsFieldFromRecord(cur);
  if (lastDirect != null) return jsonIfObjectString(lastDirect);
  if (looksLikeLeadStatsAggregate(cur)) return cur;

  const k = Object.keys(cur);
  if (k.length === 1 && cur[k[0]!] != null) return jsonIfObjectString(cur[k[0]!]);

  return undefined;
}

/**
 * Single round trip: MATERIALIZED filter CTE + dashboard aggregates as one JSON object.
 * Reuses the same `whereClause` / `params` pattern as role-scoped listing queries.
 */
export async function fetchLeadDashboardStatsPayload(
  whereClause: string,
  params: unknown[],
): Promise<LeadDashboardStatsPayload> {
  const sql = `
WITH filtered AS (
  SELECT
    l.id,
    l."leadName",
    l.source,
    l."sourceWebsiteName",
    l."sourceMetaProfileName",
    l."qualificationStatus",
    l."salesStage",
    l."leadScore",
    l.phone,
    l.country,
    l.city,
    l."createdAt",
    l.notes,
    l."lostNotes",
    l."createdById",
    l."assignedSalesExecId"
  FROM "Lead" l
  WHERE ${whereClause}
)
SELECT json_build_object(
  'total', (SELECT COUNT(*)::int FROM filtered),
  'qualified', (SELECT COUNT(*)::int FROM filtered WHERE "qualificationStatus" = '${QualificationStatus.QUALIFIED}'),
  'not_q', (SELECT COUNT(*)::int FROM filtered WHERE "qualificationStatus" = '${QualificationStatus.NOT_QUALIFIED}'),
  'irrelevant', (SELECT COUNT(*)::int FROM filtered WHERE "qualificationStatus" = '${QualificationStatus.IRRELEVANT}'),
  'closed_won', (SELECT COUNT(*)::int FROM filtered WHERE "salesStage" = '${SalesStage.CLOSED_WON}'),
  'closed_lost', (SELECT COUNT(*)::int FROM filtered WHERE "salesStage" = '${SalesStage.CLOSED_LOST}'),
  'with_exec', (SELECT COUNT(*)::int FROM filtered WHERE "salesStage" = '${SalesStage.WITH_EXECUTIVE}'),
  'with_team_lead', (SELECT COUNT(*)::int FROM filtered WHERE "salesStage" = '${SalesStage.WITH_TEAM_LEAD}'),
  'pre_sales', (SELECT COUNT(*)::int FROM filtered WHERE "salesStage" = '${SalesStage.PRE_SALES}'),
  'qualified_internal', (SELECT COUNT(*)::int FROM filtered WHERE "qualificationStatus" = '${QualificationStatus.QUALIFIED}' AND "salesStage" = '${SalesStage.PRE_SALES}'),
  'qualified_passed', (SELECT COUNT(*)::int FROM filtered WHERE "qualificationStatus" = '${QualificationStatus.QUALIFIED}' AND "salesStage" <> '${SalesStage.PRE_SALES}'),
  'passed_with_tl', (SELECT COUNT(*)::int FROM filtered WHERE "qualificationStatus" = '${QualificationStatus.QUALIFIED}' AND "salesStage" = '${SalesStage.WITH_TEAM_LEAD}'),
  'passed_with_exec', (SELECT COUNT(*)::int FROM filtered WHERE "qualificationStatus" = '${QualificationStatus.QUALIFIED}' AND "salesStage" = '${SalesStage.WITH_EXECUTIVE}'),
  'passed_won', (SELECT COUNT(*)::int FROM filtered WHERE "qualificationStatus" = '${QualificationStatus.QUALIFIED}' AND "salesStage" = '${SalesStage.CLOSED_WON}'),
  'passed_lost', (SELECT COUNT(*)::int FROM filtered WHERE "qualificationStatus" = '${QualificationStatus.QUALIFIED}' AND "salesStage" = '${SalesStage.CLOSED_LOST}'),
  'avg_lead_score', (
    SELECT ROUND(AVG("leadScore"::numeric), 1)
    FROM filtered
    WHERE "leadScore" IS NOT NULL
  ),
  'by_source', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::json)
    FROM (
      SELECT
        COALESCE(NULLIF(btrim(regexp_replace(COALESCE(source, ''), '\\s+', ' ', 'g')), ''), '—') AS label,
        COUNT(*)::int AS count
      FROM filtered
      GROUP BY 1
    ) t
  ),
  'by_stage', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::json)
    FROM (
      SELECT "salesStage" AS "stageKey", COUNT(*)::int AS count
      FROM filtered
      GROUP BY "salesStage"
    ) t
  ),
  'lead_analysts', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.total DESC), '[]'::json)
    FROM (
      SELECT
        f."createdById" AS "createdById",
        COALESCE(u.name, 'Unknown analyst') AS "cbName",
        COALESCE(u.email, '') AS "cbEmail",
        COUNT(*) FILTER (WHERE f."qualificationStatus" = '${QualificationStatus.QUALIFIED}')::int AS "qualified",
        COUNT(*) FILTER (WHERE f."qualificationStatus" = '${QualificationStatus.NOT_QUALIFIED}')::int AS "not_q",
        COUNT(*) FILTER (WHERE f."qualificationStatus" = '${QualificationStatus.IRRELEVANT}')::int AS "irrelevant",
        COUNT(*)::int AS total
      FROM filtered f
      LEFT JOIN "User" u ON u.id = f."createdById"
      GROUP BY f."createdById", u.name, u.email
    ) t
  ),
  'sales_execs', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t."assignedTotal" DESC), '[]'::json)
    FROM (
      SELECT
        f."assignedSalesExecId" AS "assignedSalesExecId",
        u.name AS "seName",
        COUNT(*)::int AS "assignedTotal",
        COUNT(*) FILTER (WHERE f."salesStage" = '${SalesStage.WITH_EXECUTIVE}')::int AS "withRepOpen",
        COUNT(*) FILTER (WHERE f."salesStage" = '${SalesStage.CLOSED_WON}')::int AS "closedWon",
        COUNT(*) FILTER (WHERE f."salesStage" = '${SalesStage.CLOSED_LOST}')::int AS "closedLost"
      FROM filtered f
      LEFT JOIN "User" u ON u.id = f."assignedSalesExecId"
      GROUP BY f."assignedSalesExecId", u.name
    ) t
  ),
  'qual_reasons', (
    SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.count DESC, x.reason ASC), '[]'::json)
    FROM (
      SELECT
        status,
        reason,
        COUNT(*)::int AS count
      FROM (
        SELECT
          "qualificationStatus" AS status,
          CASE
            WHEN split_part(COALESCE(notes, ''), E'\\n', 1) LIKE 'Qualification reason:%'
            THEN NULLIF(
              trim(substring(split_part(COALESCE(notes, ''), E'\\n', 1) from ${QUAL_REASON_SUBSTR_FROM})),
              ''
            )
            ELSE NULL
          END AS reason
        FROM filtered
        WHERE "qualificationStatus" IN ('${QualificationStatus.NOT_QUALIFIED}', '${QualificationStatus.IRRELEVANT}')
      ) r
      WHERE reason IS NOT NULL
      GROUP BY status, reason
    ) x
  ),
  'score_buckets', (
    SELECT COALESCE(
      json_agg(
        json_build_object('label', b.label, 'count', b.cnt)
        ORDER BY b.ord
      ),
      '[]'::json
    )
    FROM (
      SELECT bucket AS label, COUNT(*)::int AS cnt,
        MIN(CASE bucket
          WHEN '0–25' THEN 1
          WHEN '26–50' THEN 2
          WHEN '51–75' THEN 3
          ELSE 4
        END) AS ord
      FROM (
        SELECT CASE
          WHEN "leadScore" IS NULL THEN NULL
          WHEN "leadScore" <= 25 THEN '0–25'
          WHEN "leadScore" <= 50 THEN '26–50'
          WHEN "leadScore" <= 75 THEN '51–75'
          ELSE '76–100'
        END AS bucket
        FROM filtered
        WHERE "leadScore" IS NOT NULL
      ) s
      WHERE bucket IS NOT NULL
      GROUP BY bucket
    ) b
  ),
  'daily_trend', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
    FROM (
      SELECT
        to_char((date_trunc('day', "createdAt" AT TIME ZONE 'UTC'))::date, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "qualificationStatus" = '${QualificationStatus.QUALIFIED}')::int AS qualified,
        COUNT(*) FILTER (WHERE "salesStage" = '${SalesStage.CLOSED_WON}')::int AS won
      FROM filtered
      GROUP BY 1
    ) t
  ),
  'conv_by_country_sql', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.total DESC), '[]'::json)
    FROM (
      SELECT
        COALESCE(NULLIF(btrim(country), ''), '—') AS label,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "salesStage" = '${SalesStage.CLOSED_WON}')::int AS won
      FROM filtered
      GROUP BY 1
    ) t
  ),
  'conv_by_source_sql', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.total DESC), '[]'::json)
    FROM (
      SELECT
        COALESCE(NULLIF(btrim(regexp_replace(COALESCE(source, ''), '\\s+', ' ', 'g')), ''), '—') AS label,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "salesStage" = '${SalesStage.CLOSED_WON}')::int AS won
      FROM filtered
      GROUP BY 1
    ) t
  ),
  'conv_by_website_sql', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.total DESC), '[]'::json)
    FROM (
      SELECT
        COALESCE(NULLIF(btrim(regexp_replace(COALESCE("sourceWebsiteName", ''), '\\s+', ' ', 'g')), ''), '—') AS label,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "salesStage" = '${SalesStage.CLOSED_WON}')::int AS won
      FROM filtered
      GROUP BY 1
    ) t
  ),
  'conv_by_meta_sql', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.total DESC), '[]'::json)
    FROM (
      SELECT
        COALESCE(NULLIF(btrim(regexp_replace(COALESCE("sourceMetaProfileName", ''), '\\s+', ' ', 'g')), ''), '—') AS label,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "salesStage" = '${SalesStage.CLOSED_WON}')::int AS won
      FROM filtered
      GROUP BY 1
    ) t
  ),
  'country_qual_sql', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.total DESC), '[]'::json)
    FROM (
      SELECT
        COALESCE(NULLIF(btrim(country), ''), '—') AS label,
        COUNT(*) FILTER (WHERE "qualificationStatus" = '${QualificationStatus.QUALIFIED}')::int AS q,
        COUNT(*) FILTER (WHERE "qualificationStatus" = '${QualificationStatus.NOT_QUALIFIED}')::int AS nq,
        COUNT(*) FILTER (WHERE "qualificationStatus" = '${QualificationStatus.IRRELEVANT}')::int AS ir,
        COUNT(*)::int AS total
      FROM filtered
      GROUP BY 1
    ) t
  ),
  'city_counts_sql', (
    SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.count DESC), '[]'::json)
    FROM (
      SELECT
        (
          CASE WHEN NULLIF(btrim("city"), '') IS NULL THEN '—' ELSE btrim("city") END
          || ' · ' ||
          CASE WHEN NULLIF(btrim(country), '') IS NULL THEN '—' ELSE btrim(country) END
        ) AS label,
        COUNT(*)::int AS count
      FROM filtered
      GROUP BY 1
    ) s
  )
) AS stats`;

  const row = await dbQueryOne<{ stats: unknown }>(sql, params);
  const statsRaw = extractLeadDashboardStatsField(row);
  if (statsRaw == null) {
    throw new ExecSqlShapeError(
      "lead dashboard stats: empty or mis-shaped RPC row (missing `stats` JSON). Check Supabase exec_sql wrapping and pool row parsing.",
    );
  }
  const statsParsed =
    typeof statsRaw === "string"
      ? (() => {
          try {
            return JSON.parse(statsRaw);
          } catch {
            throw new ExecSqlShapeError(
              "lead dashboard stats: `stats` value is not valid JSON",
            );
          }
        })()
      : statsRaw;

  const validated = leadDashboardStatsSqlSchema.safeParse(statsParsed);
  if (!validated.success) {
    logLeadDashboardStatsSchemaMismatch(validated.error.flatten());
    throw new ExecSqlShapeError(
      "lead dashboard stats: aggregate JSON failed schema validation",
    );
  }

  return parseStatsRow(validated.data);
}

/** Parallel dashboard fetches: one aggregate JSON + thin rows + bounded joined slices. */
export async function fetchLeadDashboardDataBundle(
  whereClause: string,
  params: unknown[],
  order: "asc" | "desc",
): Promise<{
  stats: LeadDashboardStatsPayload;
  thin: LeadDashboardThinRow[];
  recentRows: ReportLeadDashRow[];
  pipelineRows: ReportLeadDashRow[];
  exportRows: ReportLeadDashRow[];
}> {
  // Stats RPC must run alone: parallel `exec_sql` calls risk cross-response mix-ups
  // where a singleton `{ c: "<count>" }` row can be mistaken for the stats JSON column.
  const stats = await fetchLeadDashboardStatsPayload(whereClause, params);
  const [thin, recentRows, pipelineRows, exportRows] = await Promise.all([
    fetchLeadDashboardThinRows(whereClause, params),
    fetchDashboardRecentJoinedRows(
      whereClause,
      params,
      order,
      DASHBOARD_RECENT_LEADS_LIMIT,
    ),
    fetchDashboardPipelineQualifiedJoinedRows(
      whereClause,
      params,
      order,
      DASHBOARD_PIPELINE_QUALIFIED_LIMIT,
    ),
    fetchDashboardExportSnapshotRows(
      whereClause,
      params,
      order,
      DASHBOARD_EXPORT_SNAPSHOT_LIMIT,
    ),
  ]);
  return { stats, thin, recentRows, pipelineRows, exportRows };
}

/**
 * Page size for per-lead “thin” rows used to build geography + conversion tables.
 * A single `exec_sql` round trip returning tens of thousands of JSON rows can exceed
 * Supabase/RPC payload limits and surface as an empty array — while the compact stats
 * JSON (KPIs, `score_buckets`, etc.) still loads. Chunking keeps each response small.
 */
const THIN_ROWS_PAGE_SIZE = 4000;

/** Narrow rows for phone-country and conversion bucketing (Node mirrors libphonenumber heuristics). */
export async function fetchLeadDashboardThinRows(
  whereClause: string,
  params: unknown[],
): Promise<LeadDashboardThinRow[]> {
  const out: LeadDashboardThinRow[] = [];
  let offset = 0;

  for (;;) {
    const limIdx = params.length + 1;
    const offIdx = params.length + 2;
    const page = await dbQuery<LeadDashboardThinRow>(
      `SELECT
         l.phone,
         l.country,
         l.city,
         l."qualificationStatus",
         l."salesStage",
         l.source,
         l."sourceWebsiteName",
         l."sourceMetaProfileName"
       FROM "Lead" l
       WHERE ${whereClause}
       ORDER BY l.id ASC
       LIMIT ($${limIdx})::bigint
       OFFSET ($${offIdx})::bigint`,
      [...params, THIN_ROWS_PAGE_SIZE, offset],
    );
    if (page.length === 0) break;
    out.push(...page);
    if (page.length < THIN_ROWS_PAGE_SIZE) break;
    offset += page.length;
  }

  return out;
}

export async function fetchDashboardRecentJoinedRows(
  whereClause: string,
  params: unknown[],
  order: "asc" | "desc",
  limit: number,
): Promise<ReportLeadDashRow[]> {
  const dir = order === "asc" ? "ASC" : "DESC";
  const limIdx = params.length + 1;
  return dbQuery<ReportLeadDashRow>(
    `SELECT ${LEAD_DASH_COLUMNS}
     FROM "Lead" l
     LEFT JOIN "User" cb ON cb.id = l."createdById"
     LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
     WHERE ${whereClause}
     ORDER BY l."createdAt" ${dir}, l.id ${dir}
     LIMIT ($${limIdx})::bigint`,
    [...params, limit],
  );
}

export async function fetchDashboardExportSnapshotRows(
  whereClause: string,
  params: unknown[],
  order: "asc" | "desc",
  limit: number,
): Promise<ReportLeadDashRow[]> {
  return fetchDashboardRecentJoinedRows(whereClause, params, order, limit);
}

/** Qualified leads for pipeline snapshot (bounded; capped in SQL). */
export async function fetchDashboardPipelineQualifiedJoinedRows(
  whereClause: string,
  params: unknown[],
  order: "asc" | "desc",
  limit: number,
): Promise<ReportLeadDashRow[]> {
  const dir = order === "asc" ? "ASC" : "DESC";
  const stIdx = params.length + 1;
  const limIdx = params.length + 2;
  return dbQuery<ReportLeadDashRow>(
    `SELECT ${LEAD_DASH_COLUMNS}
     FROM "Lead" l
     LEFT JOIN "User" cb ON cb.id = l."createdById"
     LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
     WHERE ${whereClause} AND l."qualificationStatus" = $${stIdx}
     ORDER BY l."createdAt" ${dir}, l.id ${dir}
     LIMIT ($${limIdx})::bigint`,
    [...params, QualificationStatus.QUALIFIED, limit],
  );
}
