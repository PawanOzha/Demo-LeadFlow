import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import { buildAtlTeamLeadDashboardViewModel } from "@/lib/atl-team-lead-dashboard-vm";
import { RechartsAnalyticsPanels } from "@/components/reports/recharts-analytics-panels";
import { QualificationStatus, SalesStage } from "@/lib/constants";

/** Per-request data (session-scoped metrics). */
export const dynamic = "force-dynamic";

/** Postgres + `pg` require Node (not Edge). */
export const runtime = "nodejs";

const countrySubtitle =
  "Phone country (E.164) for your analysts' leads (all time). Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more.";

export default async function AnalystTeamLeadReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const { vm, analystsList, teamCount } =
    await buildAtlTeamLeadDashboardViewModel(session, null, null);
  const trendByDate = new Map<
    string,
    { date: string; total: number; qualified: number; won: number }
  >();
  for (const row of vm.allLeads) {
    const day = row.createdAt.toISOString().slice(0, 10);
    const item = trendByDate.get(day) ?? {
      date: day,
      total: 0,
      qualified: 0,
      won: 0,
    };
    item.total += 1;
    if (row.qualificationStatus === QualificationStatus.QUALIFIED) {
      item.qualified += 1;
    }
    if (row.salesStage === SalesStage.CLOSED_WON) item.won += 1;
    trendByDate.set(day, item);
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-lf-text">Reports</h1>
          <p className="mt-1 text-sm text-lf-muted">
            Analyst team performance analytics and conversion overview.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DashboardReportExport payload={vm.exportPayload} />
          <Link
            href="/analyst-team-lead/team"
            className="inline-flex h-10 items-center rounded-md bg-lf-accent px-4 text-sm font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand/20 focus:ring-offset-2"
          >
            Members
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
          <p className="text-sm text-lf-muted">Analysts</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
            {analystsList.length.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
          <p className="text-sm text-lf-muted">Total Leads</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
            {vm.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
          <p className="text-sm text-lf-muted">Closed Won</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
            {vm.closedWon.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
          <p className="text-sm text-lf-muted">Sales Teams</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
            {teamCount.toLocaleString()}
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
        leadsHref="/analyst-team-lead/leads"
        recentLeadsTitle="Recent team leads"
        sectionPathname="/analyst-team-lead/reports"
        sectionSearchParams={sp}
        activeSectionRaw={Array.isArray(sp.section) ? sp.section[0] : sp.section}
      />
    </div>
  );
}
