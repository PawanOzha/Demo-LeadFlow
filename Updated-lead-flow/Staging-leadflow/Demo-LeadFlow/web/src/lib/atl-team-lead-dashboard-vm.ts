import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { analystRangeParams, analystRangeSummaryLabel } from "@/lib/analyst-date-range";
import {
  atlLeadSql,
  atlListFiltersFromSearchParams,
  type AtlLeadSqlFilters,
} from "@/lib/atl-leads";
import { UserRole } from "@/lib/constants";
import {
  fetchLeadDashboardDataBundle,
  type LeadDashboardStatsPayload,
} from "@/lib/dashboard-stats-fetch";
import {
  buildUnifiedDashboardViewModelAggregated,
  mapReportLeadDashToUnified,
  type UnifiedDashboardViewModel,
} from "@/lib/unified-dashboard-report";
import {
  teamAnalystTeamLeadColumnExists,
  claimUnassignedTeamsForSessionIfSingleAtlOrg,
} from "@/lib/team-atl-column";
import {
  PORTAL_LEAD_SOURCE_FILTER_OPTIONS,
  PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS,
} from "@/lib/portal-lead-filter-options";

export type AtlTeamLeadSession = {
  id: string;
  name: string;
  email: string;
};

const emptyBundle = {
  stats: {
    total: 0,
    qualified: 0,
    not_q: 0,
    irrelevant: 0,
    closed_won: 0,
    closed_lost: 0,
    with_exec: 0,
    with_team_lead: 0,
    pre_sales: 0,
    qualified_internal: 0,
    qualified_passed: 0,
    passed_with_tl: 0,
    passed_with_exec: 0,
    passed_won: 0,
    passed_lost: 0,
    avg_lead_score: null,
    by_source: [],
    by_stage: [],
    lead_analysts: [],
    sales_execs: [],
    qual_reasons: [],
    score_buckets: [],
    daily_trend: [],
    conv_by_country_sql: [],
    conv_by_source_sql: [],
    conv_by_website_sql: [],
    conv_by_meta_sql: [],
    country_qual_sql: [],
    city_counts_sql: [],
  } satisfies LeadDashboardStatsPayload,
  thin: [],
  recentRows: [] as Awaited<
    ReturnType<typeof fetchLeadDashboardDataBundle>
  >["recentRows"],
  pipelineRows: [] as Awaited<
    ReturnType<typeof fetchLeadDashboardDataBundle>
  >["pipelineRows"],
  exportRows: [] as Awaited<
    ReturnType<typeof fetchLeadDashboardDataBundle>
  >["exportRows"],
};

/** Unified dashboard VM for ATL from URL search params (range, filters; optional `q` when not the main dashboard). */
export async function buildAtlTeamLeadDashboardViewModel(
  session: AtlTeamLeadSession,
  sp: Record<string, string | string[] | undefined>,
  /** Main `/analyst-team-lead` dashboard has no search UI — ignore `q` in the URL (default). Other routes (e.g. qualified-pipeline) pass `{ omitSearch: false }`. */
  opts?: { omitSearch?: boolean },
): Promise<{
  vm: UnifiedDashboardViewModel;
  analystsList: { id: string; name: string }[];
  analystIds: string[];
  teamCount: number;
  rangeLabel: string;
  from: string | null;
  to: string | null;
  q: string | null;
  sourceOptions: string[];
  websiteOptions: string[];
  listFilters: AtlLeadSqlFilters;
}> {
  const omitSearch = opts?.omitSearch ?? true;
  const { from, to, q } = await analystRangeParams(sp);
  await claimUnassignedTeamsForSessionIfSingleAtlOrg(session.id);
  const analystsList = await dbQuery<{ id: string; name: string }>(
    `SELECT id, name FROM "User" WHERE "managerId" = $1 AND role = $2 ORDER BY name ASC`,
    [session.id, UserRole.LEAD_ANALYST],
  );
  const analystIds = analystsList.map((a) => a.id);
  const listFilters = atlListFiltersFromSearchParams(
    sp,
    analystIds,
    omitSearch ? null : q,
  );

  const { clause, params } = atlLeadSql(
    analystIds,
    from,
    to,
    listFilters,
    "l",
  );

  const teamCol = await teamAnalystTeamLeadColumnExists();

  const [bundle, teamCountRow] = await Promise.all([
    analystIds.length === 0
      ? Promise.resolve(emptyBundle)
      : fetchLeadDashboardDataBundle(clause, params, "desc"),
    teamCol
      ? dbQueryOne<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM "Team" WHERE "analystTeamLeadId" = $1`,
          [session.id],
        )
      : dbQueryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM "Team"`),
  ]);

  const { stats, thin, recentRows, pipelineRows, exportRows } = bundle;
  const teamCount = Number(teamCountRow?.c ?? 0);
  const generatedAt = new Date().toISOString();
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const sourceOptions = [...PORTAL_LEAD_SOURCE_FILTER_OPTIONS];
  const websiteOptions = [...PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS];

  const mapRow = (l: (typeof recentRows)[0]) => mapReportLeadDashToUnified(l);

  const vm = buildUnifiedDashboardViewModelAggregated(
    stats,
    thin,
    recentRows.map(mapRow),
    pipelineRows.map(mapRow),
    exportRows.map(mapRow),
    {
      kind: "analyst_team_lead",
      rangeLabel,
      generatedAt,
      fileNamePrefix: "leadflow-dashboard",
      reportTitle: "LeadFlow dashboard report",
      reportSubtitle: `ATL · ${session.name} · ${analystsList.length} analyst${analystsList.length === 1 ? "" : "s"}`,
      analystName: session.name,
      analystEmail: session.email,
      analystCount: analystsList.length,
      teamCount,
    },
  );

  return {
    vm,
    analystsList,
    analystIds,
    teamCount,
    rangeLabel,
    from,
    to,
    q,
    sourceOptions,
    websiteOptions,
    listFilters,
  };
}
