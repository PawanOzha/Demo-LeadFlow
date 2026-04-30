import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import { analystRangeSummaryLabel } from "@/lib/analyst-date-range";
import { mtlLeadSql } from "@/lib/mtl-leads";
import { UserRole } from "@/lib/constants";
import { buildUnifiedDashboardViewModel } from "@/lib/unified-dashboard-report";

type LeadDashRow = {
  id: string;
  leadName: string;
  source: string;
  sourceWebsiteName: string | null;
  sourceMetaProfileName: string | null;
  qualificationStatus: string;
  salesStage: string;
  leadScore: number | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  createdAt: Date;
  notes: string | null;
  lostNotes: string | null;
  createdById: string;
  assignedSalesExecId: string | null;
  cb_name: string;
  cb_email: string;
  se_name: string | null;
};

export default async function MainTeamLeadReportsPage() {
  const session = await getSession();
  if (!session) return null;

  const rangeLabel = analystRangeSummaryLabel(null, null);
  const { clause, params } = mtlLeadSql(session.id, null, null);

  const leads = await dbQuery<LeadDashRow>(
    `SELECT l.*, cb.name AS cb_name, cb.email AS cb_email, se.name AS se_name
     FROM "Lead" l
     JOIN "User" cb ON cb.id = l."createdById"
     LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
     WHERE ${clause}
     ORDER BY l."createdAt" DESC`,
    params,
  );

  const team = session.teamId
    ? await dbQueryOne<{ name: string }>(
        `SELECT name FROM "Team" WHERE id = $1`,
        [session.teamId],
      )
    : null;

  const execCountRow = session.teamId
    ? await dbQueryOne<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM "User" WHERE "teamId" = $1 AND role = $2`,
        [session.teamId, UserRole.SALES_EXECUTIVE],
      )
    : null;
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
    createdByEmail: l.cb_email,
    createdByName: l.cb_name,
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
          <h1 className="text-[22px] font-semibold tracking-tight text-lf-text">
            Report
          </h1>
          <p className="mt-1 max-w-xl text-[13px] font-normal leading-relaxed text-lf-label">
            All-time metrics · export CSV, Excel, or PDF · Team{" "}
            <span className="text-lf-text-secondary">{team?.name ?? "—"}</span>
            {execCount > 0
              ? ` · ${execCount} sales executive${execCount === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DashboardReportExport payload={vm.exportPayload} />
          <Link
            href="/team-lead/team"
            className="rounded-lg bg-lf-accent px-4 py-2.5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/20 hover:bg-lf-accent-hover"
          >
            Team
          </Link>
        </div>
      </header>

      <UnifiedPortalReportSections
        vm={vm}
        countrySubtitle="Phone country (E.164) for leads routed to your team (all time). Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more."
        leadsHref="/team-lead/leads"
        recentLeadsTitle="Recent leads"
      />
    </div>
  );
}
