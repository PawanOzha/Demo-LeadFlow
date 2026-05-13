import { getSession } from "@/lib/auth/session";
import { AnalystHeaderAddButton } from "@/components/analyst/add-lead-modal";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import { PortalDashboardSqlFiltersBar } from "@/components/portal-dashboard-sql-filters-bar";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import {
  PortalDashboardTopPanel,
  PortalDashboardTopPanelDateRow,
} from "@/components/portal-dashboard-top-panel";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  hrefWithDateRange,
  leadWhereSql,
  preservedSearchParamEntriesForDateBar,
} from "@/lib/analyst-date-range";
import { mergedPortalLeadFilters } from "@/lib/server/leads/filter-parser";
import { fetchLeadDashboardDataBundle } from "@/lib/dashboard-stats-fetch";
import {
  buildUnifiedDashboardViewModelAggregated,
  mapReportLeadDashToUnified,
  type UnifiedDashboardViewModel,
} from "@/lib/unified-dashboard-report";
import { logger } from "@/lib/server/log";
import { exportScopeFromLeadFilters } from "@/lib/portal-export-scope";
import {
  PORTAL_LEAD_SOURCE_FILTER_OPTIONS,
  PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS,
} from "@/lib/portal-lead-filter-options";

export default async function AnalystDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const [preservedEntries, { from, to }] = await Promise.all([
    preservedSearchParamEntriesForDateBar(sp),
    analystRangeParams(sp),
  ]);
  /** Main analyst dashboard: no search bar — ignore `q` from URL (list/pipeline keep search). */
  const filters = mergedPortalLeadFilters(sp, { from, to, q: null }, { omitSearch: true });
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const { clause, params } = leadWhereSql(session.id, filters);

  let vm: UnifiedDashboardViewModel | null = null;
  const sourceOptions = PORTAL_LEAD_SOURCE_FILTER_OPTIONS;
  const websiteOptions = PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS;
  try {
    const { stats, thin, recentRows, pipelineRows, exportRows } =
      await fetchLeadDashboardDataBundle(clause, params, "desc");

    const generatedAt = new Date().toISOString();
    const mapAnalyst = (l: (typeof recentRows)[0]) =>
      mapReportLeadDashToUnified(l, {
        createdById: session.id,
        createdByEmail: session.email,
        createdByName: session.name,
      });

    vm = buildUnifiedDashboardViewModelAggregated(
      stats,
      thin,
      recentRows.map(mapAnalyst),
      pipelineRows.map(mapAnalyst),
      exportRows.map(mapAnalyst),
      {
        kind: "lead_analyst",
        rangeLabel,
        generatedAt,
        fileNamePrefix: "leadflow-dashboard",
        reportTitle: "LeadFlow dashboard report",
        reportSubtitle: `${session.name} · ${session.email}`,
        analystName: session.name,
        analystEmail: session.email,
      },
    );
  } catch (error) {
    logger.error("[AnalystDashboard] failed to load page data", {
      message: error instanceof Error ? error.message : String(error),
    });
    return (
      <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-8 text-sm text-lf-danger shadow-sm">
        We could not load your dashboard. Please refresh the page or try again
        shortly. If this keeps happening, contact your admin.
      </div>
    );
  }

  if (!vm) {
    return (
      <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-8 text-sm text-lf-danger shadow-sm">
        We could not load your dashboard. Please refresh the page or try again
        shortly. If this keeps happening, contact your admin.
      </div>
    );
  }

  const leadsQuery = hrefWithDateRange("/analyst/leads", from, to, null, {
    status: filters.status ?? null,
    salesStage: filters.salesStage ?? null,
    source: filters.source ?? null,
    website: filters.sourceWebsiteName ?? null,
  });

  return (
    <div className="w-full min-w-0 space-y-8">
      <PortalDashboardTopPanel>
        <PortalDashboardTopPanelDateRow
          start={
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <AnalystDateRangeBar
                key={`${from ?? ""}|${to ?? ""}`}
                pathname="/analyst"
                defaultFrom={from ?? ""}
                defaultTo={to ?? ""}
                preservedEntries={preservedEntries}
                rangeSummary={rangeLabel}
                embedded
              />
            </div>
          }
          end={
            <>
              <DashboardReportExport
                payload={vm.exportPayload}
                exportScope={exportScopeFromLeadFilters(filters)}
              />
              <AnalystHeaderAddButton />
            </>
          }
        />
        <PortalDashboardSqlFiltersBar
          key={`${filters.status ?? ""}|${filters.salesStage ?? ""}|${filters.source ?? ""}|${filters.sourceWebsiteName ?? ""}`}
          navigatePathname="/analyst"
          status={filters.status ?? null}
          salesStage={filters.salesStage ?? null}
          source={filters.source ?? null}
          website={filters.sourceWebsiteName ?? null}
          sourceOptions={sourceOptions}
          websiteOptions={websiteOptions}
          embedded
        />
      </PortalDashboardTopPanel>

      <UnifiedPortalReportSections
        vm={vm}
        countrySubtitle="Phone country (E.164) for your leads in this filter. Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more."
        leadsHref={leadsQuery}
        recentLeadsTitle="Recently added leads"
        sectionPathname="/analyst"
        sectionSearchParams={sp}
        activeSectionRaw={Array.isArray(sp.section) ? sp.section[0] : sp.section}
        sectionsLayout="continuous"
        hideSectionJumpNav
        hideOverviewSectionIntro
      />
    </div>
  );
}
