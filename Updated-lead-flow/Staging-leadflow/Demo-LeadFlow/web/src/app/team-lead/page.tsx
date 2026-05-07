import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { dbQueryOne } from "@/lib/db/pool";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import {
  analystRangeSummaryLabel,
  hrefWithDateRange,
} from "@/lib/analyst-date-range";
import { mtlLeadSql } from "@/lib/mtl-leads";
import { UserRole } from "@/lib/constants";
import { buildUnifiedDashboardViewModel } from "@/lib/unified-dashboard-report";
import { fetchReportLeadDashRowsJoined } from "@/lib/report-joined-leads-fetch";

export default async function MainTeamLeadDashboard({
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-lf-text">Team Lead Dashboard</h1>
          <p className="mt-1 text-sm text-lf-muted">
            Team routing, conversion, and sales execution overview.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/team-lead/reports"
            className="rounded-lg border border-lf-border bg-lf-surface px-4 py-2.5 text-sm font-semibold text-lf-text shadow-sm hover:bg-lf-bg/50"
          >
            Report
          </Link>
        </div>
      </header>

      <UnifiedPortalReportSections
        vm={vm}
        countrySubtitle="Phone country (E.164) for leads routed to your team (all time). Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more."
        leadsHref={hrefWithDateRange("/team-lead/leads", null, null)}
        recentLeadsTitle="Recent leads"
        sectionPathname="/team-lead"
        sectionSearchParams={sp}
        activeSectionRaw={Array.isArray(sp.section) ? sp.section[0] : sp.section}
      />
    </div>
  );
}
