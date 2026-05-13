import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import { AtlLeadsFiltersBar } from "@/components/portal-leads/atl-leads-filters-bar";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import {
  PortalDashboardTopPanel,
  PortalDashboardTopPanelDateRow,
} from "@/components/portal-dashboard-top-panel";
import {
  hrefWithDateRange,
  preservedSearchParamEntriesForDateBar,
} from "@/lib/analyst-date-range";
import { buildAtlTeamLeadDashboardViewModel } from "@/lib/atl-team-lead-dashboard-vm";
import { logger } from "@/lib/server/log";
import { exportScopeAtlDashboard } from "@/lib/portal-export-scope";

export default async function AnalystTeamLeadDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;

  let result: Awaited<ReturnType<typeof buildAtlTeamLeadDashboardViewModel>> | null =
    null;
  try {
    result = await buildAtlTeamLeadDashboardViewModel(session, sp, {
      omitSearch: true,
    });
  } catch (error) {
    logger.error("[AnalystTeamLeadDashboard] failed to load page data", {
      message: error instanceof Error ? error.message : String(error),
    });
    return (
      <div className="p-8 text-red-500">
        Failed to load dashboard data. Please refresh or contact support.
      </div>
    );
  }

  const {
    vm,
    analystsList,
    sourceOptions,
    websiteOptions,
    from,
    to,
    listFilters,
    rangeLabel,
  } = result;
  const preservedEntries = await preservedSearchParamEntriesForDateBar(sp);

  const leadsHref = hrefWithDateRange("/analyst-team-lead/leads", from, to, null, {
    status: listFilters.qualificationStatus ?? null,
    source: listFilters.source ?? null,
    analystId: listFilters.createdById ?? null,
    website: listFilters.sourceWebsiteName ?? null,
  });

  const countrySubtitle =
    "Country from the phone number when it parses to a region; otherwise the country saved on the lead. Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more.";

  return (
    <div className="w-full min-w-0 space-y-8">
      <PortalDashboardTopPanel>
        <PortalDashboardTopPanelDateRow
          start={
            <AnalystDateRangeBar
              key={`${from ?? ""}|${to ?? ""}`}
              pathname="/analyst-team-lead"
              defaultFrom={from ?? ""}
              defaultTo={to ?? ""}
              preservedEntries={preservedEntries}
              rangeSummary={rangeLabel}
              embedded
            />
          }
          end={
            <>
              <DashboardReportExport
                payload={vm.exportPayload}
                exportScope={exportScopeAtlDashboard(from, to, null, listFilters)}
              />
              <Link
                href="/analyst-team-lead/team"
                className="rounded-lg bg-lf-accent px-4 py-2.5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/20 hover:bg-lf-accent-hover"
              >
                Members
              </Link>
            </>
          }
        />
        <AtlLeadsFiltersBar
          key={`${listFilters.qualificationStatus ?? ""}|${listFilters.createdById ?? ""}|${listFilters.source ?? ""}|${listFilters.sourceWebsiteName ?? ""}`}
          navigatePathname="/analyst-team-lead"
          status={listFilters.qualificationStatus ?? null}
          analystId={listFilters.createdById ?? null}
          source={listFilters.source ?? null}
          website={listFilters.sourceWebsiteName ?? null}
          analystOptions={analystsList.map((a) => ({ id: a.id, name: a.name }))}
          sourceOptions={sourceOptions}
          websiteOptions={websiteOptions}
          embedded
        />
      </PortalDashboardTopPanel>

      <UnifiedPortalReportSections
        vm={vm}
        countrySubtitle={countrySubtitle}
        leadsHref={leadsHref}
        recentLeadsTitle="Recent team leads"
        sectionPathname="/analyst-team-lead"
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
