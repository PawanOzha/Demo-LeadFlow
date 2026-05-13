import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import { PortalDashboardSearchBar } from "@/components/portal-dashboard-search-bar";
import { PortalDashboardSqlFiltersBar } from "@/components/portal-dashboard-sql-filters-bar";
import { dbQueryOne } from "@/lib/db/pool";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  hrefWithDateRange,
  preservedSearchParamEntriesForDateBar,
} from "@/lib/analyst-date-range";
import { mtlLeadSql } from "@/lib/mtl-leads";
import { mergedPortalLeadFilters } from "@/lib/server/leads/filter-parser";
import { UserRole } from "@/lib/constants";
import { fetchLeadDashboardDataBundle } from "@/lib/dashboard-stats-fetch";
import {
  buildUnifiedDashboardViewModelAggregated,
  mapReportLeadDashToUnified,
  type UnifiedDashboardViewModel,
} from "@/lib/unified-dashboard-report";
import { RechartsAnalyticsPanels } from "@/components/reports/recharts-analytics-panels";
import {
  PortalDashboardTopPanel,
  PortalDashboardTopPanelDateRow,
} from "@/components/portal-dashboard-top-panel";
import { AppError } from "@/lib/app-error";
import { logger } from "@/lib/server/log";
import { exportScopeFromLeadFilters } from "@/lib/portal-export-scope";
import { teamLeadDashboardMetricsSchema } from "@/lib/team-lead-dashboard-metrics-schema";
import {
  PORTAL_LEAD_SOURCE_FILTER_OPTIONS,
  PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS,
} from "@/lib/portal-lead-filter-options";

export default async function MainTeamLeadReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const [preservedEntries, { from, to, q }] = await Promise.all([
    preservedSearchParamEntriesForDateBar(sp),
    analystRangeParams(sp),
  ]);
  const filters = mergedPortalLeadFilters(sp, { from, to, q });
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const { clause, params } = mtlLeadSql(session.id, filters);

  let vm: UnifiedDashboardViewModel | null = null;
  const sourceOptions = PORTAL_LEAD_SOURCE_FILTER_OPTIONS;
  const websiteOptions = PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS;

  try {
    const [{ stats, thin, recentRows, pipelineRows, exportRows }, team, execCountRow] =
      await Promise.all([
      fetchLeadDashboardDataBundle(clause, params, "desc"),
      session.teamId
        ? dbQueryOne<{ name: string }>(
            `SELECT name FROM "Team" WHERE id = $1`,
            [session.teamId],
          )
        : Promise.resolve(null),
      session.teamId
        ? dbQueryOne<{ c: string }>(
            `SELECT COUNT(*)::text AS c FROM "User" WHERE "teamId" = $1 AND role = $2`,
            [session.teamId, UserRole.SALES_EXECUTIVE],
          )
        : Promise.resolve(null),
    ]);

    const execCountParsed = teamLeadDashboardMetricsSchema.safeParse({
      execCount: Number(execCountRow?.c ?? 0),
    });
    if (!execCountParsed.success) {
      logger.error("[MainTeamLeadReportsPage] dashboard metrics validation failed", {
        issues: execCountParsed.error.flatten(),
      });
      throw new AppError(
        "Team lead reports metrics failed validation",
        execCountParsed.error.flatten(),
      );
    }
    const { execCount } = execCountParsed.data;

    const generatedAt = new Date().toISOString();
    const mapRow = (l: (typeof recentRows)[0]) => mapReportLeadDashToUnified(l);
    vm = buildUnifiedDashboardViewModelAggregated(
      stats,
      thin,
      recentRows.map(mapRow),
      pipelineRows.map(mapRow),
      exportRows.map(mapRow),
      {
        kind: "main_team_lead",
        rangeLabel,
        generatedAt,
        fileNamePrefix: "leadflow-dashboard",
        reportTitle: "LeadFlow dashboard report",
        reportSubtitle: `MTL · ${team?.name ?? "—"}`,
        analystName: session.name,
        analystEmail: session.email,
        teamName: team?.name ?? "—",
        execCount,
      },
    );
  } catch (error) {
    logger.error("[MainTeamLeadReportsPage] failed to load page data", {
      message: error instanceof Error ? error.message : String(error),
    });
    return (
      <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-8 text-sm text-lf-danger shadow-sm">
        We could not load this report. Please refresh the page or try again shortly.
        If this keeps happening, contact your admin.
      </div>
    );
  }

  if (!vm) {
    return (
      <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-8 text-sm text-lf-danger shadow-sm">
        We could not load this report. Please refresh the page or try again shortly.
        If this keeps happening, contact your admin.
      </div>
    );
  }
  const trendByDate = new Map<
    string,
    { date: string; total: number; qualified: number; won: number }
  >();
  const trendSource = vm.dailyTrend ?? [];
  for (const row of trendSource) {
    trendByDate.set(row.date, {
      date: row.date,
      total: row.total,
      qualified: row.qualified,
      won: row.won,
    });
  }
  const trendData = [...trendByDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);
  const statusData = [
    { name: "Qualified", value: vm.qualified },
    { name: "Not Qualified", value: vm.notQ },
    { name: "Irrelevant", value: vm.irrelevant },
  ];
  const rankingData = vm.sourceEntries.slice(0, 8).map(([name, value]) => ({
    name,
    value,
  }));

  const leadsHref = hrefWithDateRange("/team-lead/leads", from, to, q, {
    status: filters.status ?? null,
    salesStage: filters.salesStage ?? null,
    source: filters.source ?? null,
    website: filters.sourceWebsiteName ?? null,
  });

  const countrySubtitle =
    "Phone country (E.164) for leads routed to your team in this filter. Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more.";

  return (
    <div className="w-full min-w-0 space-y-8">
      <PortalDashboardTopPanel>
        <PortalDashboardTopPanelDateRow
          start={
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <AnalystDateRangeBar
                key={`${from ?? ""}|${to ?? ""}`}
                pathname="/team-lead/reports"
                defaultFrom={from ?? ""}
                defaultTo={to ?? ""}
                preservedEntries={preservedEntries}
                rangeSummary={rangeLabel}
                embedded
              />
              <div className="min-w-0 w-full sm:max-w-md sm:flex-1">
                <PortalDashboardSearchBar
                  key={q ?? ""}
                  initialQ={q}
                  pathname="/team-lead/reports"
                  showLabel={false}
                  embedded
                  nestInPanelRow
                />
              </div>
            </div>
          }
          end={
            <>
              <DashboardReportExport
                payload={vm.exportPayload}
                exportScope={exportScopeFromLeadFilters(filters)}
              />
              <Link
                href="/team-lead/team"
                className="rounded-lg bg-lf-accent px-4 py-2.5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/20 transition duration-200 ease-out hover:bg-lf-accent-hover"
              >
                Team
              </Link>
            </>
          }
        />
        <PortalDashboardSqlFiltersBar
          key={`${filters.status ?? ""}|${filters.salesStage ?? ""}|${filters.source ?? ""}|${filters.sourceWebsiteName ?? ""}`}
          navigatePathname="/team-lead/reports"
          status={filters.status ?? null}
          salesStage={filters.salesStage ?? null}
          source={filters.source ?? null}
          website={filters.sourceWebsiteName ?? null}
          sourceOptions={sourceOptions}
          websiteOptions={websiteOptions}
          embedded
        />
      </PortalDashboardTopPanel>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
          <p className="text-sm text-lf-muted">Total Leads</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
            {vm.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
          <p className="text-sm text-lf-muted">Qualified</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
            {vm.qualified.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
          <p className="text-sm text-lf-muted">Closed Won</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
            {vm.closedWon.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
          <p className="text-sm text-lf-muted">Conversion Rate</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
            {vm.total > 0 ? `${((vm.closedWon / vm.total) * 100).toFixed(1)}%` : "0%"}
          </p>
        </div>
      </section>

      <RechartsAnalyticsPanels
        trendData={trendData}
        statusData={statusData}
        rankingData={rankingData}
      />

      <UnifiedPortalReportSections
        vm={vm}
        countrySubtitle={countrySubtitle}
        leadsHref={leadsHref}
        recentLeadsTitle="Recent leads"
        sectionPathname="/team-lead/reports"
        sectionSearchParams={sp}
        activeSectionRaw={Array.isArray(sp.section) ? sp.section[0] : sp.section}
        omitSectionIds={["qualified-pipeline"]}
        sectionsLayout="continuous"
        hideSectionJumpNav
        hideOverviewSectionIntro
      />
    </div>
  );
}
