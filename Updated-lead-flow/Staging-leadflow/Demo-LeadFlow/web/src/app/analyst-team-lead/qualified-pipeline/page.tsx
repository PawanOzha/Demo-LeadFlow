import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import { PortalDashboardSearchBar } from "@/components/portal-dashboard-search-bar";
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
import { exportScopeAtlDashboard } from "@/lib/portal-export-scope";

/** Per-request data (session-scoped metrics). */
export const dynamic = "force-dynamic";

/** Postgres + `pg` require Node (not Edge). */
export const runtime = "nodejs";

export default async function AnalystTeamLeadQualifiedPipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const result = await buildAtlTeamLeadDashboardViewModel(session, sp, {
    omitSearch: false,
  });
  const {
    vm,
    analystsList,
    sourceOptions,
    websiteOptions,
    from,
    to,
    q,
    listFilters,
    rangeLabel,
  } = result;
  const preservedEntries = await preservedSearchParamEntriesForDateBar(sp);

  const leadsHref = hrefWithDateRange("/analyst-team-lead/leads", from, to, q, {
    status: listFilters.qualificationStatus ?? null,
    source: listFilters.source ?? null,
    analystId: listFilters.createdById ?? null,
    website: listFilters.sourceWebsiteName ?? null,
  });

  const countrySubtitle =
    "Country from the phone number when it parses to a region; otherwise the country saved on the lead. Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more.";

  return (
    <div className="w-full min-w-0 space-y-6 pb-12">
      <PortalDashboardTopPanel>
        <PortalDashboardTopPanelDateRow
          start={
            <AnalystDateRangeBar
              key={`${from ?? ""}|${to ?? ""}`}
              pathname="/analyst-team-lead/qualified-pipeline"
              defaultFrom={from ?? ""}
              defaultTo={to ?? ""}
              preservedEntries={preservedEntries}
              rangeSummary={rangeLabel}
              embedded
            />
          }
          end={
            <>
              <Link
                href="/analyst-team-lead/leads"
                className="inline-flex h-10 shrink-0 items-center rounded-lg border border-lf-border bg-lf-surface px-4 text-sm font-semibold text-lf-text shadow-sm transition-colors hover:bg-lf-bg/50"
              >
                View leads
              </Link>
              <DashboardReportExport
                payload={vm.exportPayload}
                exportScope={exportScopeAtlDashboard(from, to, q, listFilters)}
              />
            </>
          }
        />
        <PortalDashboardSearchBar
          key={q ?? ""}
          initialQ={q}
          pathname="/analyst-team-lead/qualified-pipeline"
          showLabel={false}
          embedded
        />
        <AtlLeadsFiltersBar
          key={`${listFilters.qualificationStatus ?? ""}|${listFilters.createdById ?? ""}|${listFilters.source ?? ""}|${listFilters.sourceWebsiteName ?? ""}`}
          navigatePathname="/analyst-team-lead/qualified-pipeline"
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
        sectionPathname="/analyst-team-lead/qualified-pipeline"
        sectionSearchParams={sp}
        activeSectionRaw={Array.isArray(sp.section) ? sp.section[0] : sp.section}
        onlySectionIds={["qualified-pipeline"]}
        sectionsLayout="continuous"
        qualifiedPipelineMaxRows={null}
      />
    </div>
  );
}
