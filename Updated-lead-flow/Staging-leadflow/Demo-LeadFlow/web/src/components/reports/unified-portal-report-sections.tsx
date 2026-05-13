import Link from "next/link";
import { PersonWithMiniAvatar } from "@/components/user-mini-avatar";
import { LeadsByCityReportCard } from "@/components/leads-by-city-report-card";
import { LeadsByCountryQualCard } from "@/components/leads-by-country-qual-card";
import { LeadSourcePill } from "@/components/lead-source-display";
import { PortalSectionJumpTabs } from "@/components/portal-section-jump-tabs";
import { ReportScrollSectionNav } from "@/components/reports/report-scroll-section-nav";
import {
  formatAnalystDate,
  pipelineNoteForLead,
  pipelinePillForLead,
} from "@/lib/analyst-ui";
import type {
  ConversionDimRow,
  UnifiedDashboardViewModel,
} from "@/lib/unified-dashboard-report";
import {
  BadgeCheck,
  Ban,
  Layers,
  ThumbsDown,
  Trophy,
  XCircle,
} from "lucide-react";
import { PremiumMetricCard } from "@/components/dashboard/premium-metric-card";
import { PortalDashboardOverviewCharts } from "@/components/dashboard/portal-dashboard-overview-charts";

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
function ConversionTable({
  title,
  rows,
}: {
  title: string;
  rows: ConversionDimRow[];
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-lf-border/80 bg-lf-bg/25 p-4 shadow-sm shadow-black/[0.03] dark:bg-lf-elevated/20">
      <div className="mb-3 border-b border-lf-border/60 pb-3">
        <h3 className="text-sm font-semibold tracking-tight text-lf-text">
          {title}
        </h3>
        <p className="mt-0.5 text-[11px] leading-snug text-lf-subtle">
          Won ÷ leads in bucket (closed won only)
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <table className="w-full min-w-[260px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-lf-border/70 text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
              <th className="py-2.5 pr-2 text-left font-medium">Bucket</th>
              <th className="w-14 py-2.5 pr-2 text-right font-medium">Leads</th>
              <th className="w-12 py-2.5 pr-2 text-right font-medium">Won</th>
              <th className="w-[4.25rem] py-2.5 text-right font-medium">
                Conv.
              </th>
            </tr>
          </thead>
          <tbody className="text-lf-muted">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-sm text-lf-subtle"
                >
                  No data in this range.
                </td>
              </tr>
            ) : (
              rows.slice(0, 20).map((r, i) => (
                <tr
                  key={`${i}-${r.label}`}
                  className="border-b border-lf-border/40 last:border-0 hover:bg-lf-surface/80 dark:hover:bg-lf-elevated/40"
                >
                  <td
                    className="max-w-[11rem] truncate py-2.5 pr-2 font-medium text-lf-text-secondary"
                    title={r.label}
                  >
                    {r.label}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums text-lf-muted">
                    {r.total.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums text-lf-muted">
                    {r.won.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-medium text-lf-text">
                    {Number.isFinite(r.conversionPct)
                      ? `${r.conversionPct.toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 20 ? (
        <p className="mt-3 border-t border-lf-border/50 pt-3 text-center text-[11px] text-lf-subtle">
          Showing top 20 buckets by lead volume.
        </p>
      ) : null}
    </div>
  );
}

function Card({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm shadow-black/8 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  className = "mb-8 max-w-3xl space-y-2",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
        {eyebrow}
      </p>
      <h2 className="text-xl font-semibold tracking-tight text-lf-text sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="text-sm leading-relaxed text-lf-muted">{description}</p>
      ) : null}
    </header>
  );
}

export function UnifiedPortalReportSections({
  vm,
  countrySubtitle,
  leadsHref,
  recentLeadsTitle = "Recent leads",
  sectionPathname,
  sectionSearchParams,
  activeSectionRaw,
  topRightSlot,
  sectionsLayout = "tabbed",
  omitSectionIds,
  onlySectionIds,
  qualifiedPipelineMaxRows,
  qualifiedPipelineHeaderActions,
  hideSectionJumpNav,
  overviewHeaderActions,
  /** When true (continuous layout only), hide the Overview / Pipeline snapshot text block; KPI cards and charts stay. */
  hideOverviewSectionIntro = false,
}: {
  vm: UnifiedDashboardViewModel;
  countrySubtitle: string;
  leadsHref: string;
  recentLeadsTitle?: string;
  sectionPathname?: string;
  sectionSearchParams?: Record<string, string | string[] | undefined>;
  activeSectionRaw?: string;
  topRightSlot?: React.ReactNode;
  /** Single scroll page with hash jump nav (default tabbed URL `?section=`). */
  sectionsLayout?: "tabbed" | "continuous";
  /** When true, do not render the section jump tabs/nav strip (continuous scroll only). */
  hideSectionJumpNav?: boolean;
  /** Rendered on the same row as the Overview / Pipeline snapshot intro (continuous layout). */
  overviewHeaderActions?: React.ReactNode;
  hideOverviewSectionIntro?: boolean;
  /** Hide these section ids from tabs and body (e.g. omit qualified pipeline on ATL dashboard). */
  omitSectionIds?: readonly string[];
  /** When set, show only these sections (tabs + body). */
  onlySectionIds?: readonly string[];
  /** Max rows in qualified pipeline table; `null` shows all rows. Default 12. */
  qualifiedPipelineMaxRows?: number | null;
  /** Optional controls rendered inside the qualified pipeline card header. */
  qualifiedPipelineHeaderActions?: React.ReactNode;
}) {
  const {
    meta,
    total,
    qualified,
    notQ,
    irrelevant,
    qualRate,
    closedWon,
    closedLost,
    pipelineInProgress,
    countryRows,
    cityRows,
    stageEntries,
    scoreBuckets,
    atlPassed,
    recent,
    pipelineQualified,
    conversionByCountry,
    conversionByWebsite,
    conversionByProfile,
    conversionBySource,
    leadAnalystBreakdown,
    salesExecOutcomes,
    qualificationReasonRows,
    dailyTrend,
  } = vm;

  const overallConversion =
    total > 0 ? ((closedWon / total) * 100).toFixed(1) : "—";
  const baseSectionTabs = [
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Team performance" },
    ...(atlPassed ? [{ id: "routing", label: "Routing" }] : []),
    { id: "recent-leads", label: "Recent leads" },
    { id: "geography", label: "Geography" },
    { id: "conversion", label: "Conversion" },
    ...(scoreBuckets.length > 0 ? [{ id: "score", label: "Score" }] : []),
    { id: "qualified-pipeline", label: "Qualified pipeline" },
  ];
  const sectionTabs =
    onlySectionIds?.length
      ? baseSectionTabs.filter((t) => onlySectionIds.includes(t.id))
      : omitSectionIds?.length
        ? baseSectionTabs.filter((t) => !omitSectionIds.includes(t.id))
        : baseSectionTabs;
  const showSectionJumpNav =
    sectionTabs.length > 1 && !hideSectionJumpNav;
  const tabIdSet = new Set(sectionTabs.map((t) => t.id));
  const activeSection = tabIdSet.has(activeSectionRaw ?? "")
    ? (activeSectionRaw as string)
    : (sectionTabs[0]?.id ?? "overview");
  const tabHref = (sectionId: string) => {
    if (!sectionPathname) return `#${sectionId}`;
    const qs = new URLSearchParams();
    if (sectionSearchParams) {
      for (const [k, v] of Object.entries(sectionSearchParams)) {
        const fv = first(v);
        if (!fv || k === "section") continue;
        qs.set(k, fv);
      }
    }
    qs.set("section", sectionId);
    return `${sectionPathname}?${qs.toString()}`;
  };

  const isContinuous = sectionsLayout === "continuous";
  const sectionIncluded = (id: string) => {
    if (onlySectionIds?.length) return onlySectionIds.includes(id);
    if (omitSectionIds?.length && omitSectionIds.includes(id)) return false;
    return true;
  };
  const sectionVisible = (id: string) =>
    sectionIncluded(id) && (isContinuous || activeSection === id);
  const hasTopHeader = showSectionJumpNav || Boolean(topRightSlot);

  const pipelineQualifiedRows =
    qualifiedPipelineMaxRows === null
      ? pipelineQualified
      : pipelineQualified.slice(0, qualifiedPipelineMaxRows ?? 12);

  const scrollHref = (sectionId: string) => {
    if (!sectionPathname) return `#${sectionId}`;
    const qs = new URLSearchParams();
    if (sectionSearchParams) {
      for (const [k, v] of Object.entries(sectionSearchParams)) {
        const fv = first(v);
        if (!fv || k === "section") continue;
        qs.set(k, fv);
      }
    }
    const q = qs.toString();
    return `${sectionPathname}${q ? `?${q}` : ""}#${sectionId}`;
  };

  return (
    <div
      className={`flex flex-col ${isContinuous ? "gap-16 sm:gap-20" : "gap-8"}`}
    >
      {hasTopHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          {showSectionJumpNav ? (
            isContinuous ? (
              <ReportScrollSectionNav
                tabs={sectionTabs.map((t) => ({
                  ...t,
                  href: scrollHref(t.id),
                }))}
              />
            ) : (
              <PortalSectionJumpTabs
                tabs={sectionTabs.map((t) => ({ ...t, href: tabHref(t.id) }))}
                activeId={activeSection}
              />
            )
          ) : null}
          {topRightSlot ? (
            <div className="w-full max-w-[30rem]">{topRightSlot}</div>
          ) : null}
        </div>
      ) : null}

      {sectionVisible("overview") ? (
      <section
        id="overview"
        className={`space-y-8 ${isContinuous ? "scroll-mt-28" : "scroll-mt-20"}`}
      >
        {isContinuous && (!hideOverviewSectionIntro || overviewHeaderActions) ? (
          <div
            className={`mb-8 flex flex-wrap gap-4 ${
              hideOverviewSectionIntro
                ? "items-center justify-end"
                : "items-start justify-between"
            }`}
          >
            {!hideOverviewSectionIntro ? (
              <SectionIntro
                className="mb-0 max-w-3xl min-w-0 flex-1 space-y-2"
                eyebrow="Overview"
                title="Pipeline snapshot"
                description="Volume, qualification mix, and funnel depth for the selected range."
              />
            ) : null}
            {overviewHeaderActions ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {overviewHeaderActions}
              </div>
            ) : null}
          </div>
        ) : null}
        <div
          className={
            isContinuous
              ? "space-y-10 rounded-3xl border border-lf-border/70 bg-lf-surface/90 p-6 shadow-sm sm:p-8"
              : "contents"
          }
        >
        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <PremiumMetricCard
            icon={Layers}
            accent="cyan"
            label="Total leads"
            value={total}
            hint={meta.rangeLabel === "All time" ? "In scope" : meta.rangeLabel}
          />
          <PremiumMetricCard
            icon={BadgeCheck}
            accent="blue"
            label="Qualified"
            value={qualified}
            hint={`${qualRate}% of total`}
          />
          <PremiumMetricCard
            icon={XCircle}
            accent="amber"
            label="Not qualified"
            value={notQ}
            hint={`${total ? Math.round((notQ / total) * 100) : 0}% of total`}
          />
          <PremiumMetricCard
            icon={Ban}
            accent="slate"
            label="Irrelevant"
            value={irrelevant}
            hint={`${total ? Math.round((irrelevant / total) * 100) : 0}% of total`}
          />
          <PremiumMetricCard
            icon={Trophy}
            accent="emerald"
            label="Total won"
            value={closedWon}
            hint={`${overallConversion}% conversion (won ÷ all)`}
          />
          <PremiumMetricCard
            icon={ThumbsDown}
            accent="rose"
            label="Total lost"
            value={closedLost}
            hint={`${pipelineInProgress} still with rep`}
          />
        </section>

        <PortalDashboardOverviewCharts
          rangeEmpty={total === 0}
          dailyTrend={dailyTrend ?? []}
          qualified={qualified}
          notQ={notQ}
          irrelevant={irrelevant}
          stageRows={stageEntries.map((s) => ({
            label: s.label,
            count: s.count,
          }))}
        />
        </div>
      </section>
      ) : null}

      {sectionVisible("performance") ? (
      <section
        id="performance"
        className={`space-y-6 ${isContinuous ? "scroll-mt-28" : "scroll-mt-20"}`}
      >
        {isContinuous ? (
          <SectionIntro
            eyebrow="Team performance"
            title="Analysts, executives, and disqualification reasons"
            description="Who created and progressed leads, plus the reasons driving not qualified and irrelevant outcomes."
          />
        ) : null}
        <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-lf-text">
            Lead analysts — qualification
          </h2>
          <p className="mt-1 text-sm text-lf-muted">
            Counts by lead creator in this range: qualified, not qualified, and
            irrelevant.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-lf-border text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
                  <th className="pb-3 pr-3 font-medium">Lead analyst</th>
                  <th className="pb-3 pr-3 font-medium">Total</th>
                  <th className="pb-3 pr-3 font-medium">Qualified</th>
                  <th className="pb-3 pr-3 font-medium">Not Q</th>
                  <th className="pb-3 font-medium">Irrelevant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lf-divide text-lf-muted">
                {leadAnalystBreakdown.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-lf-subtle"
                    >
                      No leads in range.
                    </td>
                  </tr>
                ) : (
                  leadAnalystBreakdown.map((r, i) => (
                    <tr key={`la-${i}-${r.label}`}>
                      <td className="max-w-[14rem] truncate py-2.5 pr-3 font-medium text-lf-text-secondary">
                        {r.label}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-lf-text">
                        {r.total}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-lf-success">
                        {r.qualified}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{r.notQ}</td>
                      <td className="py-2.5 tabular-nums">{r.irrelevant}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-lf-text">
            Sales executives — assigned & outcomes
          </h2>
          <p className="mt-1 text-sm text-lf-muted">
            Leads assigned to each rep in this range;{" "}
            <span className="text-lf-text-secondary">With rep</span> is still
            active on the executive.{" "}
            <span className="text-lf-text-secondary">Won / lost</span> are
            closed outcomes.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-lf-border text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
                  <th className="pb-3 pr-3 font-medium">Sales executive</th>
                  <th className="pb-3 pr-3 font-medium">Assigned</th>
                  <th className="pb-3 pr-3 font-medium">With rep</th>
                  <th className="pb-3 pr-3 font-medium">Won</th>
                  <th className="pb-3 font-medium">Lost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lf-divide text-lf-muted">
                {salesExecOutcomes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-lf-subtle"
                    >
                      No leads in range.
                    </td>
                  </tr>
                ) : (
                  salesExecOutcomes.map((r, i) => (
                    <tr key={`se-${i}-${r.label}`}>
                      <td className="max-w-[12rem] truncate py-2.5 pr-3 font-medium text-lf-text-secondary">
                        {r.label}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-lf-text">
                        {r.assignedTotal}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {r.withRepOpen}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-lf-success">
                        {r.closedWon}
                      </td>
                      <td className="py-2.5 tabular-nums text-lf-danger">
                        {r.closedLost}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        </div>

        <Card>
          <h2 className="text-base font-semibold text-lf-text">
            Not qualified / Irrelevant reasons
          </h2>
          <p className="mt-1 text-sm text-lf-muted">
            Distribution of selected reasons in this range.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-lf-border text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
                  <th className="pb-3 pr-3 font-medium">Status</th>
                  <th className="pb-3 pr-3 font-medium">Reason</th>
                  <th className="pb-3 font-medium">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lf-divide text-lf-muted">
                {qualificationReasonRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-lf-subtle">
                      No reason data in range.
                    </td>
                  </tr>
                ) : (
                  qualificationReasonRows.map((r) => (
                    <tr key={`${r.status}-${r.reason}`}>
                      <td className="py-3 pr-3 font-medium text-lf-text-secondary">
                        {String(r.status ?? "").replaceAll("_", " ") || "—"}
                      </td>
                      <td className="py-3 pr-3">{r.reason}</td>
                      <td className="py-3 tabular-nums text-lf-text">{r.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
      ) : null}

      {sectionVisible("routing") && atlPassed ? (
        <Card
          id="routing"
          className={isContinuous ? "scroll-mt-28" : "scroll-mt-20"}
        >
          {isContinuous ? (
            <SectionIntro
              eyebrow="Routing"
              title="Qualified leads passed to sales"
              description="Qualified leads that have left internal routing (handed to a main team onward)."
            />
          ) : (
            <>
              <h2 className="text-base font-semibold text-lf-text">
                Qualified leads passed to sales
              </h2>
              <p className="mt-1 text-sm text-lf-muted">
                Qualified leads that have left internal routing (handed to a main
                team onward)
              </p>
            </>
          )}
          <div className="mt-6 flex flex-wrap items-end gap-6 border-b border-lf-border pb-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-lf-subtle">
                Passed
              </p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-lf-text">
                {atlPassed.qualifiedPassed}
              </p>
              <p className="mt-1 text-xs text-lf-subtle">
                {qualified > 0
                  ? `${atlPassed.passedPct}% of qualified in range`
                  : "No qualified leads in range"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-lf-subtle">
                Still internal (qualified)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-lf-muted">
                {atlPassed.qualifiedInternal}
              </p>
              <p className="mt-1 text-xs text-lf-subtle">
                Awaiting routing to a main team
              </p>
            </div>
          </div>
          {atlPassed.qualifiedPassed > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["With main team (no rep yet)", atlPassed.passedWithTl],
                  ["With sales executive", atlPassed.passedWithExec],
                  ["Closed — won", atlPassed.passedWon],
                  ["Closed — lost", atlPassed.passedLost],
                ] as const
              ).map(([label, val]) => (
                <div
                  key={label}
                  className="rounded-xl border border-lf-border bg-lf-bg px-4 py-3"
                >
                  <p className="text-xs text-lf-subtle">{label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-lf-text">
                    {val}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {sectionVisible("recent-leads") ? (
      <Card
        id="recent-leads"
        className={isContinuous ? "scroll-mt-28" : "scroll-mt-20"}
      >
        {isContinuous ? (
          <SectionIntro
            eyebrow="Recent leads"
            title={recentLeadsTitle}
            description="Latest rows in range with lead analyst, website, source, and pipeline stage. Open the full list for search and filters."
          />
        ) : null}
        <div
          className={`mb-4 flex items-center gap-2 ${isContinuous ? "justify-end" : "justify-between"}`}
        >
          {!isContinuous ? (
            <h2 className="text-base font-semibold text-lf-text">
              {recentLeadsTitle}
            </h2>
          ) : null}
          <Link
            href={leadsHref}
            className="text-sm font-medium text-lf-link hover:text-lf-link"
          >
            View all
          </Link>
        </div>
        <p className="mb-4 text-xs text-lf-subtle">
          Source-level counts and conversion appear under{" "}
          <span className="text-lf-muted">Conversion ratio by dimension</span>{" "}
          (by source).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lf-border text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
                <th className="pb-3 pr-4 font-medium">Source</th>
                <th className="pb-3 pr-4 font-medium">Lead</th>
                <th className="pb-3 pr-4 font-medium">Website</th>
                <th className="pb-3 pr-4 font-medium">Lead analyst</th>
                <th className="pb-3 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lf-divide">
              {recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-lf-subtle"
                  >
                    No leads in this range.
                  </td>
                </tr>
              ) : (
                recent.map((l) => (
                  <tr key={l.id} className="text-lf-muted">
                    <td className="py-3 pr-4">
                      <LeadSourcePill source={l.source} />
                    </td>
                    <td className="py-3 pr-4 font-semibold text-lf-text">
                      {l.leadName || "—"}
                    </td>
                    <td className="max-w-[min(14rem,30vw)] py-3 pr-4 align-top text-[12px] text-lf-text-secondary">
                      <span
                        className="block truncate"
                        title={l.portalWebsite ?? undefined}
                      >
                        {l.portalWebsite ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-lf-text-secondary">
                      <PersonWithMiniAvatar
                        id={l.createdById.trim() || l.id}
                        name={l.createdByName}
                        image={l.createdByImage}
                      />
                    </td>
                    <td className="py-3 text-xs text-lf-muted">
                      {pipelinePillForLead(
                        l.qualificationStatus,
                        l.salesStage,
                      ).label}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      ) : null}

      {sectionVisible("geography") ? (
      <section
        id="geography"
        className={`space-y-8 ${isContinuous ? "scroll-mt-28" : "scroll-mt-20"}`}
      >
        {isContinuous ? (
          <SectionIntro
            eyebrow="Geography"
            title="Where leads originate"
            description="Country and city signals derived from phone and address fields to spot regional concentration."
          />
        ) : null}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <LeadsByCountryQualCard rows={countryRows} subtitle={countrySubtitle} />
          <LeadsByCityReportCard rows={cityRows} />
        </div>
      </section>
      ) : null}

      {sectionVisible("conversion") ? (
      <Card
        id="conversion"
        className={isContinuous ? "scroll-mt-28" : "scroll-mt-20"}
      >
        <div className="space-y-6">
        {isContinuous ? (
          <SectionIntro
            eyebrow="Conversion"
            title="Conversion ratio by dimension"
          />
        ) : (
          <h2 className="text-base font-semibold text-lf-text">
            Conversion ratio by dimension
          </h2>
        )}
        <p className="max-w-3xl text-sm leading-relaxed text-lf-muted">
          Share of <span className="font-medium text-lf-text-secondary">won</span>{" "}
          deals within each bucket (total leads in that bucket as denominator).
          Website and Meta profile use source detail fields; blanks group as —.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ConversionTable title="By country" rows={conversionByCountry} />
          <ConversionTable title="By website / brand" rows={conversionByWebsite} />
          <ConversionTable
            title="By Meta profile"
            rows={conversionByProfile}
          />
          <ConversionTable title="By source" rows={conversionBySource} />
        </div>
        </div>
      </Card>
      ) : null}

      {sectionVisible("score") && scoreBuckets.length > 0 ? (
        <Card
          id="score"
          className={isContinuous ? "scroll-mt-28" : "scroll-mt-20"}
        >
          {isContinuous ? (
            <SectionIntro
              eyebrow="Score"
              title="Lead score distribution"
              description="How scored leads stack across buckets for the same range as the rest of this report."
            />
          ) : (
            <h2 className="mb-4 text-base font-semibold text-lf-text">
              Lead score distribution
            </h2>
          )}
          <ul
            className="divide-y divide-lf-border/50 overflow-hidden rounded-lg border border-lf-border/50 bg-lf-bg/25 text-sm dark:bg-lf-elevated/15"
            role="list"
          >
            {scoreBuckets.map(({ label, count }) => (
              <li
                key={label}
                className="flex items-center justify-between gap-4 px-3 py-2.5 text-lf-muted transition-colors hover:bg-lf-surface/80 dark:hover:bg-lf-elevated/25"
                role="listitem"
              >
                <span className="font-medium text-lf-text-secondary">
                  {label}
                </span>
                <span className="rounded-md bg-lf-surface/90 px-2 py-0.5 text-xs font-semibold tabular-nums text-lf-text shadow-sm ring-1 ring-lf-border/50 dark:bg-lf-elevated/50">
                  {count.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {sectionVisible("qualified-pipeline") ? (
      <Card
        id="qualified-pipeline"
        className={isContinuous ? "scroll-mt-28" : "scroll-mt-20"}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            {isContinuous ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
                Qualified pipeline
              </p>
            ) : null}
            <h2
              className={
                isContinuous
                  ? "text-xl font-semibold tracking-tight text-lf-text sm:text-2xl"
                  : "text-base font-semibold text-lf-text"
              }
            >
              Qualified pipeline detail
            </h2>
            <p className="text-sm leading-relaxed text-lf-muted">
              All qualified leads in range — same rows as export “Qualified pipeline
              detail”. For closed lost, the note is the sales executive’s loss
              reason.
            </p>
          </div>
          {qualifiedPipelineHeaderActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {qualifiedPipelineHeaderActions}
            </div>
          ) : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lf-border text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
                <th className="pb-3 pr-4 font-medium">Lead</th>
                <th className="pb-3 pr-4 font-medium">Website</th>
                <th className="pb-3 pr-4 font-medium">Lead analyst</th>
                <th className="pb-3 pr-4 font-medium">Qualified on</th>
                <th className="pb-3 pr-4 font-medium">Pipeline</th>
                <th className="pb-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lf-divide">
              {pipelineQualifiedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-lf-subtle"
                  >
                    No qualified leads in range.
                  </td>
                </tr>
              ) : (
                pipelineQualifiedRows.map((l) => {
                  const pill = pipelinePillForLead(
                    l.qualificationStatus,
                    l.salesStage,
                  );
                  return (
                    <tr key={l.id}>
                      <td className="py-3 pr-4 font-semibold text-lf-text">
                        {l.leadName || "—"}
                      </td>
                      <td className="max-w-[min(14rem,26vw)] py-3 pr-4 align-top text-[12px] text-lf-text-secondary">
                        <span
                          className="block truncate"
                          title={l.portalWebsite ?? undefined}
                        >
                          {l.portalWebsite ?? "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-lf-text-secondary">
                        <PersonWithMiniAvatar
                          id={l.createdById.trim() || l.id}
                          name={l.createdByName}
                          image={l.createdByImage}
                        />
                      </td>
                      <td className="py-3 pr-4 text-lf-muted">
                        {formatAnalystDate(l.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      </td>
                      <td className="max-w-xs py-3 text-lf-muted">
                        {pipelineNoteForLead(
                          l.qualificationStatus,
                          l.salesStage,
                          l.notes,
                          l.lostNotes,
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      ) : null}
    </div>
  );
}
