import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { buildAtlTeamLeadDashboardViewModel } from "@/lib/atl-team-lead-dashboard-vm";

export default async function AnalystTeamLeadDashboard() {
  const session = await getSession();
  if (!session) return null;

  const { vm, analystsList, teamCount } =
    await buildAtlTeamLeadDashboardViewModel(session, null, null);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-lf-text">
            Dashboard
          </h1>
          <p className="mt-1 max-w-xl text-[13px] font-normal leading-relaxed text-lf-label">
            All-time snapshot · {analystsList.length} analyst
            {analystsList.length === 1 ? "" : "s"} · {teamCount} sales team
            {teamCount === 1 ? "" : "s"}. Open{" "}
            <Link
              href="/analyst-team-lead/reports"
              className="font-medium text-lf-link hover:underline"
            >
              Report
            </Link>{" "}
            for the same metrics with CSV, Excel, or PDF export.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/analyst-team-lead/reports"
            className="rounded-lg border border-lf-border bg-lf-surface px-4 py-2.5 text-sm font-semibold text-lf-text shadow-sm hover:bg-lf-bg/50"
          >
            Report
          </Link>
          <Link
            href="/analyst-team-lead/team"
            className="rounded-lg bg-lf-accent px-4 py-2.5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/20 hover:bg-lf-accent-hover"
          >
            Members
          </Link>
        </div>
      </header>

      <div className="rounded-xl border border-lf-accent/30 bg-lf-accent/5 px-4 py-3 text-sm text-lf-text-secondary">
        <p>
          <span className="font-semibold text-lf-text">Exports</span> (CSV, Excel,
          PDF) are on{" "}
          <Link
            href="/analyst-team-lead/reports"
            className="font-medium text-lf-link hover:underline"
          >
            Report
          </Link>
          . This page always shows{" "}
          <span className="font-medium text-lf-text">all-time</span> metrics for your
          team.
        </p>
      </div>

      <UnifiedPortalReportSections
        vm={vm}
        countrySubtitle="Phone country (E.164) for your analysts' leads (all time). Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more."
        leadsHref="/analyst-team-lead/leads"
        recentLeadsTitle="Recent team leads"
      />
    </div>
  );
}
