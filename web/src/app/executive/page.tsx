import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";
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
  cb_name: string | null;
  cb_email: string | null;
};

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

  const leads = await dbQuery<LeadDashRow>(
    `SELECT l.*, cb.name AS cb_name, cb.email AS cb_email
     FROM "Lead" l
     LEFT JOIN "User" cb ON cb.id = l."createdById"
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

      <AnalystDateRangeBar
        key={`${from ?? ""}|${to ?? ""}`}
        pathname="/executive"
        defaultFrom={from ?? ""}
        defaultTo={to ?? ""}
        preservedEntries={preservedEntries}
        rangeSummary={rangeLabel}
      />

      <UnifiedPortalReportSections
        vm={vm}
        countrySubtitle="Phone country (E.164) for leads assigned to you in this range. Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more."
        leadsHref={hrefWithDateRange("/executive/leads", from, to)}
        recentLeadsTitle="Recent leads"
      />
    </div>
  );
}
