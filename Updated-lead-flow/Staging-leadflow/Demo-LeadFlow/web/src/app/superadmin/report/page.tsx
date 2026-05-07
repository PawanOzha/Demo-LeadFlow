import type { Metadata } from "next";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import { SuperadminReportCharts } from "@/components/superadmin/superadmin-report-charts";
import { SuperadminReportExport } from "@/components/superadmin/superadmin-report-export";
import { SuperadminReportHistograms } from "@/components/superadmin/superadmin-report-histograms";
import { UnifiedPortalReportSections } from "@/components/reports/unified-portal-report-sections";
import { RechartsAnalyticsPanels } from "@/components/reports/recharts-analytics-panels";
import { PortalSectionJumpTabs } from "@/components/portal-section-jump-tabs";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  hrefWithDateRange,
  preservedSearchParamEntriesForDateBar,
} from "@/lib/analyst-date-range";
import { getSuperadminReportAggregates } from "@/lib/superadmin-stats";
import { buildUnifiedDashboardViewModel } from "@/lib/unified-dashboard-report";
import { QualificationStatus, SalesStage } from "@/lib/constants";

function first(sp: string | string[] | undefined): string | undefined {
  if (Array.isArray(sp)) return sp[0];
  return sp;
}

function sectionHref(
  sp: Record<string, string | string[] | undefined>,
  section: string,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const fv = first(v);
    if (!fv || k === "reportSection") continue;
    qs.set(k, fv);
  }
  qs.set("reportSection", section);
  return `/superadmin/report?${qs.toString()}`;
}

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
  const sectionRaw = first(sp.reportSection);
  const section =
    sectionRaw === "histograms" ||
    sectionRaw === "ratios" ||
    sectionRaw === "unified-dashboard"
      ? sectionRaw
      : "overview";
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
  const trendByDate = new Map<
    string,
    { date: string; total: number; qualified: number; won: number }
  >();
  for (const row of r.leads) {
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
    { name: "Qualified", value: r.qualified },
    { name: "Not Qualified", value: r.notQualified },
    { name: "Irrelevant", value: r.irrelevant },
  ];
  const rankingData = vm.sourceEntries.slice(0, 8).map(([name, value]) => ({
    name,
    value,
  }));
  const reportTabs = [
    { id: "overview", label: "Overview", href: sectionHref(sp, "overview") },
    { id: "histograms", label: "Histograms", href: sectionHref(sp, "histograms") },
    { id: "ratios", label: "Ratios", href: sectionHref(sp, "ratios") },
    {
      id: "unified-dashboard",
      label: "Unified dashboard",
      href: sectionHref(sp, "unified-dashboard"),
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-lf-text">Reports</h1>
          <p className="mt-1 text-sm text-lf-muted">
            Organization-wide analytics and performance overview.
          </p>
        </div>
        <PortalSectionJumpTabs tabs={reportTabs} activeId={section} />
        <div className="flex w-full max-w-[40rem] flex-wrap items-start justify-end gap-2 rounded-xl border border-lf-border bg-lf-surface/70 p-2 shadow-sm">
          <SuperadminReportExport payload={vm.exportPayload} />
          <div className="w-full max-w-[28rem]">
            <AnalystDateRangeBar
              key={`${from ?? ""}|${to ?? ""}`}
              pathname="/superadmin/report"
              defaultFrom={from ?? ""}
              defaultTo={to ?? ""}
              preservedEntries={preservedEntries}
              rangeSummary={rangeLabel}
              compact
            />
          </div>
        </div>
      </div>

      {section === "overview" ? (
      <section id="overview" className="space-y-10 scroll-mt-20">
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
            <p className="text-sm text-lf-muted">Total Leads</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
              {r.total.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
            <p className="text-sm text-lf-muted">Qualified</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
              {r.qualified.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
            <p className="text-sm text-lf-muted">Closed Won</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
              {r.closedWon.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-5">
            <p className="text-sm text-lf-muted">Conversion Rate</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-lf-text">
              {r.total > 0 ? `${((r.closedWon / r.total) * 100).toFixed(1)}%` : "0%"}
            </p>
          </div>
        </section>

        <RechartsAnalyticsPanels
          trendData={trendData}
          statusData={statusData}
          rankingData={rankingData}
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
      </section>
      ) : null}

      {section === "histograms" ? (
      <section id="histograms" className="scroll-mt-20">
        <SuperadminReportHistograms
          scoreHistogram={r.scoreHistogram}
          createdByMonth={r.createdByMonth}
          countryHistogram={r.countryHistogram}
        />
      </section>
      ) : null}

      {section === "ratios" ? (
      <div id="ratios" className="scroll-mt-20">
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
      ) : null}

      {section === "unified-dashboard" ? (
      <div
        id="unified-dashboard"
        className="rounded-xl border border-lf-border bg-lf-surface p-5 shadow-sm scroll-mt-20"
      >
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
            sectionPathname="/superadmin/report"
            sectionSearchParams={sp}
            activeSectionRaw={
              Array.isArray(sp.reportSection) ? sp.reportSection[0] : sp.reportSection
            }
          />
        </div>
      </div>
      ) : null}
    </div>
  );
}
