import { z } from "zod";

/** Zod schema for the JSON object inside `SELECT ... json_build_object(...) AS stats` (after envelope peel). */
const sqlConvDimRow = z.object({
  label: z.string(),
  total: z.coerce.number(),
  won: z.coerce.number(),
});

const sqlCountryQualRow = z.object({
  label: z.string(),
  q: z.coerce.number(),
  nq: z.coerce.number(),
  ir: z.coerce.number(),
  total: z.coerce.number(),
});

const sqlCityCountRow = z.object({
  label: z.string(),
  count: z.coerce.number(),
});

export const leadDashboardStatsSqlSchema = z.object({
  total: z.coerce.number(),
  qualified: z.coerce.number(),
  not_q: z.coerce.number(),
  irrelevant: z.coerce.number(),
  closed_won: z.coerce.number(),
  closed_lost: z.coerce.number(),
  with_exec: z.coerce.number(),
  with_team_lead: z.coerce.number(),
  pre_sales: z.coerce.number(),
  qualified_internal: z.coerce.number(),
  qualified_passed: z.coerce.number(),
  passed_with_tl: z.coerce.number(),
  passed_with_exec: z.coerce.number(),
  passed_won: z.coerce.number(),
  passed_lost: z.coerce.number(),
  avg_lead_score: z.coerce.number().nullish(),
  by_source: z.array(z.unknown()).default([]),
  by_stage: z.array(z.unknown()).default([]),
  lead_analysts: z.array(z.unknown()).default([]),
  sales_execs: z.array(z.unknown()).default([]),
  qual_reasons: z.array(z.unknown()).default([]),
  score_buckets: z.array(z.unknown()).default([]),
  daily_trend: z.array(z.unknown()).default([]),
  /** DB-side rollups used when per-lead “thin” fetch returns no rows (RPC limits). */
  conv_by_country_sql: z.array(sqlConvDimRow).default([]),
  conv_by_source_sql: z.array(sqlConvDimRow).default([]),
  conv_by_website_sql: z.array(sqlConvDimRow).default([]),
  conv_by_meta_sql: z.array(sqlConvDimRow).default([]),
  country_qual_sql: z.array(sqlCountryQualRow).default([]),
  city_counts_sql: z.array(sqlCityCountRow).default([]),
});

export type LeadDashboardStatsSqlParsed = z.infer<
  typeof leadDashboardStatsSqlSchema
>;
