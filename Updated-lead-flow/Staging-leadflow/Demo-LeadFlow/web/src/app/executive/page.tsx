import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { dbQueryOne } from "@/lib/db/pool";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import { PortalDashboardSqlFiltersBar } from "@/components/portal-dashboard-sql-filters-bar";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  hrefWithDateRange,
  preservedSearchParamEntriesForDateBar,
} from "@/lib/analyst-date-range";
import { execLeadSql } from "@/lib/exec-leads";
import { mergedPortalLeadFilters } from "@/lib/server/leads/filter-parser";
import {
  PortalDashboardTopPanel,
  PortalDashboardTopPanelDateRow,
} from "@/components/portal-dashboard-top-panel";
import { UserRole } from "@/lib/constants";
import { fetchLeadDashboardDataBundle } from "@/lib/dashboard-stats-fetch";
import {
  buildUnifiedDashboardViewModelAggregated,
  mapReportLeadDashToUnified,
  type UnifiedDashboardViewModel,
} from "@/lib/unified-dashboard-report";
import { AppError } from "@/lib/app-error";
import { logger } from "@/lib/server/log";
import { exportScopeFromLeadFilters } from "@/lib/portal-export-scope";
import { teamLeadDashboardMetricsSchema } from "@/lib/team-lead-dashboard-metrics-schema";
import {
  PORTAL_LEAD_SOURCE_FILTER_OPTIONS,
  PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS,
} from "@/lib/portal-lead-filter-options";

export default async function ExecutiveDashboardPage({
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
  /** Executive main dashboard only — `/executive/leads` still uses URL search. */
  const filters = mergedPortalLeadFilters(sp, { from, to, q: null }, { omitSearch: true });
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const { clause, params } = execLeadSql(session.id, filters);

  let vm: UnifiedDashboardViewModel | null = null;
  const sourceOptions = PORTAL_LEAD_SOURCE_FILTER_OPTIONS;
  const websiteOptions = PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS;
  let teamNameDisplay = "—";

  try {
    const [bundle, team, execCountRow] = await Promise.all([
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

    teamNameDisplay = team?.name?.trim() || "—";

    const execCountParsed = teamLeadDashboardMetricsSchema.safeParse({
      execCount: Number(execCountRow?.c ?? 0),
    });
    if (!execCountParsed.success) {
      logger.error("[ExecutiveDashboard] dashboard metrics validation failed", {
        issues: execCountParsed.error.flatten(),
      });
      throw new AppError(
        "Executive dashboard metrics failed validation",
        execCountParsed.error.flatten(),
      );
    }
    const { execCount } = execCountParsed.data;

    const generatedAt = new Date().toISOString();
    const mapExec = (l: (typeof bundle.recentRows)[0]) =>
      mapReportLeadDashToUnified(l, { assignedRepName: session.name });

    vm = buildUnifiedDashboardViewModelAggregated(
      bundle.stats,
      bundle.thin,
      bundle.recentRows.map(mapExec),
      bundle.pipelineRows.map(mapExec),
      bundle.exportRows.map(mapExec),
      {
        kind: "sales_executive",
        rangeLabel,
        generatedAt,
        fileNamePrefix: "leadflow-executive-dashboard",
        reportTitle: "LeadFlow dashboard report",
        reportSubtitle: `Sales executive · ${session.name} · ${teamNameDisplay}`,
        analystName: session.name,
        analystEmail: session.email,
        teamName: teamNameDisplay,
        execCount,
      },
    );
  } catch (error) {
    logger.error("[ExecutiveDashboard] failed to load page data", {
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

  const leadsHref = hrefWithDateRange("/executive/leads", from, to, null, {
    status: filters.status ?? null,
    salesStage: filters.salesStage ?? null,
    source: filters.source ?? null,
    website: filters.sourceWebsiteName ?? null,
  });

  const countrySubtitle =
    "Phone country (E.164) for leads assigned to you in this filter. Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more.";

  return (
    <div className="w-full min-w-0 space-y-8">
      <PortalDashboardTopPanel>
        <PortalDashboardTopPanelDateRow
          start={
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <AnalystDateRangeBar
                key={`${from ?? ""}|${to ?? ""}`}
                pathname="/executive"
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
              <Link
                href={leadsHref}
                className="rounded-lg bg-lf-accent px-4 py-2.5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/20 transition duration-200 ease-out hover:bg-lf-accent-hover"
              >
                My leads
              </Link>
            </>
          }
        />
        <PortalDashboardSqlFiltersBar
          key={`${filters.status ?? ""}|${filters.salesStage ?? ""}|${filters.source ?? ""}|${filters.sourceWebsiteName ?? ""}`}
          navigatePathname="/executive"
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
        countrySubtitle={countrySubtitle}
        leadsHref={leadsHref}
        recentLeadsTitle="Recent leads"
        sectionPathname="/executive"
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
