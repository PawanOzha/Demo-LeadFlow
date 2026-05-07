import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { dbQueryOne } from "@/lib/db/pool";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import { analystRangeSummaryLabel } from "@/lib/analyst-date-range";
import { mtlLeadSql } from "@/lib/mtl-leads";
import { QualificationStatus, SalesStage, UserRole } from "@/lib/constants";
import { buildUnifiedDashboardViewModel } from "@/lib/unified-dashboard-report";
import { RechartsAnalyticsPanels } from "@/components/reports/recharts-analytics-panels";
import { fetchReportLeadDashRowsJoined } from "@/lib/report-joined-leads-fetch";

export default async function MainTeamLeadReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const rangeLabel = analystRangeSummaryLabel(null, null);
  const { clause, params } = mtlLeadSql(session.id, null, null, "l");

  const [leads, team, execCountRow] = await Promise.all([
    fetchReportLeadDashRowsJoined(clause, params, "desc"),
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
  const execCount = Number(execCountRow?.c ?? 0);

  const generatedAt = new Date().toISOString();
  const unifiedRows = leads.map((l) => ({
    id: l.id,
    leadName: l.leadName,
    source: l.source,
    sourceWebsiteName: l.sourceWebsiteName,
    sourceMetaProfileName: l.sourceMetaProfileName,
    qualificationStatus: l.qualificationStatus,
    salesStage: l.salesStage,
    leadScore: l.leadScore,
    phone: l.phone,
    country: l.country,
    city: l.city,
    createdAt: l.createdAt,
    notes: l.notes,
    lostNotes: l.lostNotes,
    createdById: l.createdById,
    createdByEmail: l.cb_email ?? "",
    createdByName: l.cb_name ?? "Unknown analyst",
    assignedSalesExecId: l.assignedSalesExecId,
    assignedRepName: l.se_name ?? null,
  }));

  const vm = buildUnifiedDashboardViewModel(unifiedRows, {
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
  });
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-lf-text">Reports</h1>
          <p className="mt-1 text-sm text-lf-muted">
            Team performance and conversion analytics overview.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DashboardReportExport payload={vm.exportPayload} />
          <Link
            href="/team-lead/team"
            className="inline-flex h-10 items-center rounded-md bg-lf-accent px-4 text-sm font-semibold text-lf-on-accent hover:bg-lf-accent-hover active:scale-[0.98]"
          >
            Team
          </Link>
        </div>
      </header>

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
        countrySubtitle="Phone country (E.164) for leads routed to your team (all time). Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more."
        leadsHref="/team-lead/leads"
        recentLeadsTitle="Recent leads"
        sectionPathname="/team-lead/reports"
        sectionSearchParams={sp}
        activeSectionRaw={Array.isArray(sp.section) ? sp.section[0] : sp.section}
      />
    </div>
  );
}
