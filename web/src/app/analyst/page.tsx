import { getSession } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db/pool";
import { AnalystHeaderAddButton } from "@/components/analyst/add-lead-modal";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import {
  analystRangeSummaryLabel,
  hrefWithDateRange,
  leadWhereSql,
} from "@/lib/analyst-date-range";
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
  assignedSalesExecId: string | null;
  se_name: string | null;
};

export default async function AnalystDashboard() {
  const session = await getSession();
  if (!session) return null;

  const rangeLabel = analystRangeSummaryLabel(null, null);
  const { clause, params } = leadWhereSql(session.id, null, null);

  const leads = await dbQuery<LeadDashRow>(
    `SELECT l.*, se.name AS se_name
     FROM "Lead" l
     LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
     WHERE ${clause}
     ORDER BY l."createdAt" DESC`,
    params,
  );

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
    createdById: session.id,
    createdByEmail: session.email,
    createdByName: session.name,
    assignedSalesExecId: l.assignedSalesExecId,
    assignedRepName: l.se_name ?? null,
  }));

  const vm = buildUnifiedDashboardViewModel(unifiedRows, {
    kind: "lead_analyst",
    rangeLabel,
    generatedAt,
    fileNamePrefix: "leadflow-dashboard",
    reportTitle: "LeadFlow dashboard report",
    reportSubtitle: `${session.name} · ${session.email}`,
    analystName: session.name,
    analystEmail: session.email,
  });

  return (
    <div className="w-full min-w-0 space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DashboardReportExport payload={vm.exportPayload} />
          <AnalystHeaderAddButton />
        </div>
      </header>

      <UnifiedPortalReportSections
        vm={vm}
        countrySubtitle="Phone country (E.164) for your leads (all time). Each row splits qualified, not qualified, and irrelevant. Sorted by total leads; the list shows the top 10 countries by default when there are more."
        leadsHref={hrefWithDateRange("/analyst/leads", null, null)}
        recentLeadsTitle="Recently added leads"
      />
    </div>
  );
}
