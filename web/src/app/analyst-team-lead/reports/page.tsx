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

  const { vm } = await buildAtlTeamLeadDashboardViewModel(session, null, null);

  return (
    <div className="w-full min-w-0 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DashboardReportExport payload={vm.exportPayload} />
          <Link
            href="/analyst-team-lead/team"
            className="h-9 rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2"
          >
            Members
          </Link>
        </div>
      </header>

      <div className="rounded-xl border border-lf-border bg-lf-surface p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold text-lf-text">
          Unified portal dashboard (same as Superadmin sections)
        </h2>
        <p className="mt-1 text-[11px] text-lf-muted">
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
