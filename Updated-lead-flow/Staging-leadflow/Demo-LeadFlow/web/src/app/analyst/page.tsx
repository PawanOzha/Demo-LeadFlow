import { getSession } from "@/lib/auth/session";
import { AnalystHeaderAddButton } from "@/components/analyst/add-lead-modal";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import {
  analystRangeSummaryLabel,
  hrefWithDateRange,
  leadWhereSql,
} from "@/lib/analyst-date-range";
import { buildUnifiedDashboardViewModel } from "@/lib/unified-dashboard-report";
import { fetchReportLeadDashRowsJoined } from "@/lib/report-joined-leads-fetch";

export default async function AnalystDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;

  const rangeLabel = analystRangeSummaryLabel(null, null);
  const { clause, params } = leadWhereSql(session.id, null, null);

  const leads = await fetchReportLeadDashRowsJoined(clause, params, "desc");

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
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-lf-text">Analyst Dashboard</h1>
          <p className="mt-1 text-sm text-lf-muted">
            Pipeline health, qualification quality, and recent activity.
          </p>
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
        sectionPathname="/analyst"
        sectionSearchParams={sp}
        activeSectionRaw={Array.isArray(sp.section) ? sp.section[0] : sp.section}
      />
    </div>
  );
}
