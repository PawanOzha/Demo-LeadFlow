import type { Metadata } from "next";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import { SuperadminReportCharts } from "@/components/superadmin/superadmin-report-charts";
import { SuperadminReportExport } from "@/components/superadmin/superadmin-report-export";
import { SuperadminReportHistograms } from "@/components/superadmin/superadmin-report-histograms";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  hrefWithDateRange,
  preservedSearchParamEntriesForDateBar,
} from "@/lib/analyst-date-range";
import { getSuperadminReportAggregates } from "@/lib/superadmin-stats";
import { buildUnifiedDashboardViewModel } from "@/lib/unified-dashboard-report";

export const metadata: Metadata = {
  title: "Report · Superadmin",
};

function RatioCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-lf-border bg-lf-surface p-5 shadow-sm">
      <p className="text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        {label}
      </p>
      <p className="mt-2 text-[22px] font-semibold tracking-tight text-lf-text tabular-nums">
        {value}
      </p>
      {sub ? <p className="mt-1 text-[11px] text-lf-muted">{sub}</p> : null}
    </div>
  );
}

export default async function SuperadminReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const [preservedEntries, { from, to }] = await Promise.all([
    preservedSearchParamEntriesForDateBar(sp),
    analystRangeParams(sp),
  ]);
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const r = await getSuperadminReportAggregates({ from, to });
  const generatedAt = new Date().toISOString();

  const unifiedRows = r.leads.map((l) => ({
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
    createdById: l.createdBy.id,
    createdByEmail: l.createdBy.email,
    createdByName: l.createdBy.name,
    assignedSalesExecId: l.assignedSalesExec?.id ?? null,
    assignedRepName: l.assignedSalesExec?.name ?? null,
  }));

  const vm = buildUnifiedDashboardViewModel(unifiedRows, {
    kind: "superadmin",
    rangeLabel,
    generatedAt,
    fileNamePrefix: "leadflow-dashboard",
    reportTitle: "LeadFlow dashboard report",
    reportSubtitle: "Organization-wide · Superadmin",
    analystName: "Superadmin",
    analystEmail: "—",
    analystCount: undefined,
    teamCount: undefined,
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          
        </div>
        <SuperadminReportExport payload={vm.exportPayload} />
      </div>

      <AnalystDateRangeBar
        key={`${from ?? ""}|${to ?? ""}`}
        pathname="/superadmin/report"
        defaultFrom={from ?? ""}
        defaultTo={to ?? ""}
        preservedEntries={preservedEntries}
        rangeSummary={rangeLabel}
      />

      <SuperadminReportCharts
        totalLeads={r.total}
        qualified={r.qualified}
        notQualified={r.notQualified}
        irrelevant={r.irrelevant}
        closedWon={r.closedWon}
        closedLost={r.closedLost}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <RatioCard
          label="Closed revenue (date range)"
          value={r.totalClosedRevenueInRange.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
          sub="Sum of closed revenue on won leads in range. Mixed currencies are summed numerically."
        />
        <RatioCard
          label="Pipeline estimate (date range)"
          value={r.totalEstimatedPipelineInRange.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
          sub="Sum of analyst deal estimates for leads created in this range."
        />
      </div>

      <SuperadminReportHistograms
        scoreHistogram={r.scoreHistogram}
        createdByMonth={r.createdByMonth}
        countryHistogram={r.countryHistogram}
      />

      <div>
        <h2 className="text-[15px] font-semibold text-lf-text">Ratios</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RatioCard
            label="Conversion (won / all leads)"
            value={`${r.conversionRatio.toFixed(1)}%`}
            sub={`${r.closedWon} won of ${r.total} leads`}
          />
          <RatioCard
            label="Win rate (won / closed)"
            value={
              r.closedWon + r.closedLost > 0
                ? `${r.winRateAmongClosed.toFixed(1)}%`
                : "—"
            }
            sub="Among closed won + lost only"
          />
          <RatioCard
            label="Qualified ratio"
            value={`${r.qualifiedRatio.toFixed(1)}%`}
            sub={`${r.qualified} of ${r.total}`}
          />
          <RatioCard
            label="Not qualified ratio"
            value={`${r.notQualifiedRatio.toFixed(1)}%`}
            sub={`${r.notQualified} of ${r.total}`}
          />
          <RatioCard
            label="Irrelevant ratio"
            value={`${r.irrelevantRatio.toFixed(1)}%`}
            sub={`${r.irrelevant} of ${r.total}`}
          />
          <RatioCard
            label="Lost (closed lost / all leads)"
            value={`${r.lostRatioOfAll.toFixed(1)}%`}
            sub={`${r.closedLost} lost of ${r.total}`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-lf-border bg-lf-surface p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold text-lf-text">
          Unified portal dashboard (same as other roles)
        </h2>
        <p className="mt-1 text-[11px] text-lf-muted">
          {rangeLabel === "All time"
            ? "All-time data · matches the analyst / team lead / executive dashboard layout and export tables."
            : `Leads created in ${rangeLabel} · export uses the same range.`}
        </p>
        <div className="mt-6 space-y-8">
          <UnifiedPortalReportSections
            vm={vm}
            countrySubtitle="Phone country (E.164) for all leads. Each row splits qualified, not qualified, and irrelevant."
            leadsHref={hrefWithDateRange("/superadmin/leads", from, to)}
            recentLeadsTitle="Recent leads (org-wide)"
          />
        </div>
      </div>
    </div>
  );
}
