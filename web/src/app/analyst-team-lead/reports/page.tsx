import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import { buildAtlTeamLeadDashboardViewModel } from "@/lib/atl-team-lead-dashboard-vm";

/** Per-request data (session-scoped metrics). */
export const dynamic = "force-dynamic";

/** Postgres + `pg` require Node (not Edge). */
export const runtime = "nodejs";

const countrySubtitle =
  "Phone country (E.164) for your analysts' leads (all time). Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more.";

export default async function AnalystTeamLeadReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { vm, analystsList, teamCount } =
    await buildAtlTeamLeadDashboardViewModel(session, null, null);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-lf-text md:text-3xl">
            Report
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-lf-muted">
            Single consolidated view — KPIs, funnel, analysts, routing to sales,
            geography, and conversion (all-time lead creation).{" "}
            {analystsList.length} analyst
            {analystsList.length === 1 ? "" : "s"} · {teamCount} sales team
            {teamCount === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DashboardReportExport payload={vm.exportPayload} />
          <Link
            href="/analyst-team-lead/team"
            className="rounded-lg bg-lf-accent px-4 py-2.5 text-sm font-semibold text-lf-on-accent shadow-lg shadow-[#c62828]/30 hover:bg-lf-accent-hover"
          >
            Members
          </Link>
        </div>
      </header>

      <div className="rounded-2xl border border-lf-border bg-lf-bg/90 p-6">
        <h2 className="text-sm font-semibold text-lf-text-secondary">
          Unified portal dashboard (same as Superadmin sections)
        </h2>
        <p className="mt-1 text-xs text-lf-subtle">
          All-time data · matches the analyst / team lead / executive dashboard
          layout and export tables (scoped to your analysts).
        </p>
        <div className="mt-6 space-y-8">
          <UnifiedPortalReportSections
            vm={vm}
            countrySubtitle={countrySubtitle}
            leadsHref="/analyst-team-lead/leads"
            recentLeadsTitle="Recent team leads"
          />
        </div>
      </div>
    </div>
  );
}
