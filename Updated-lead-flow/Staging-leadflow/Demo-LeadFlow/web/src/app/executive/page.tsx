import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { dbQueryOne } from "@/lib/db/pool";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  hrefWithDateRange,
  preservedSearchParamEntriesForDateBar,
} from "@/lib/analyst-date-range";
import { execLeadSql } from "@/lib/exec-leads";
import { UserRole } from "@/lib/constants";
import { buildUnifiedDashboardViewModel } from "@/lib/unified-dashboard-report";
import { fetchReportLeadDashRowsJoined } from "@/lib/report-joined-leads-fetch";

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
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const { clause, params } = execLeadSql(session.id, from, to, "l");

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
    assignedRepName: session.name,
  }));

  const vm = buildUnifiedDashboardViewModel(unifiedRows, {
    kind: "sales_executive",
    rangeLabel,
    generatedAt,
    fileNamePrefix: "leadflow-dashboard",
    reportTitle: "LeadFlow dashboard report",
    reportSubtitle: `Sales executive · ${session.name} · ${team?.name ?? "—"}`,
    analystName: session.name,
    analystEmail: session.email,
    teamName: team?.name ?? "—",
    execCount,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-lf-text">Executive Dashboard</h1>
          <p className="mt-1 text-sm text-lf-muted">
            Track your assigned leads, conversion trend, and outcomes.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DashboardReportExport payload={vm.exportPayload} />
          <Link
            href={hrefWithDateRange("/executive/leads", from, to)}
            className="text-sm font-medium text-lf-link hover:text-lf-link-bright"
          >
            View all leads →
          </Link>
        </div>
      </header>

      <UnifiedPortalReportSections
        vm={vm}
        countrySubtitle="Phone country (E.164) for leads assigned to you in this range. Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more."
        leadsHref={hrefWithDateRange("/executive/leads", from, to)}
        recentLeadsTitle="Recent leads"
        sectionPathname="/executive"
        sectionSearchParams={sp}
        activeSectionRaw={Array.isArray(sp.section) ? sp.section[0] : sp.section}
        topRightSlot={
          <AnalystDateRangeBar
            key={`${from ?? ""}|${to ?? ""}`}
            pathname="/executive"
            defaultFrom={from ?? ""}
            defaultTo={to ?? ""}
            preservedEntries={preservedEntries}
            rangeSummary={rangeLabel}
            compact
          />
        }
      />
    </div>
  );
}
