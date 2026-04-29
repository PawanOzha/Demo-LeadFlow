import Link from "next/link";
import { LeadsByCityReportCard } from "@/components/leads-by-city-report-card";
import { LeadsByCountryQualCard } from "@/components/leads-by-country-qual-card";
import { LeadSourcePill } from "@/components/lead-source-display";
import {
  formatAnalystDate,
  pipelineNoteForLead,
  pipelinePillForLead,
} from "@/lib/analyst-ui";
import type {
  ConversionDimRow,
  UnifiedDashboardViewModel,
} from "@/lib/unified-dashboard-report";
function ConversionTable({
  title,
  rows,
}: {
  title: string;
  rows: ConversionDimRow[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-lf-text-secondary">{title}</h3>
      <p className="mt-0.5 text-xs text-lf-subtle">
        Won ÷ leads in bucket (closed won only)
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className="border-b border-lf-border text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
              <th className="pb-2 pr-3 font-medium">Bucket</th>
              <th className="pb-2 pr-3 font-medium">Leads</th>
              <th className="pb-2 pr-3 font-medium">Won</th>
              <th className="pb-2 font-medium">Conv. %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lf-divide text-lf-muted">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-sm text-lf-subtle">
                  No data.
                </td>
              </tr>
            ) : (
              rows.slice(0, 20).map((r, i) => (
                <tr key={`${i}-${r.label}`}>
                  <td className="max-w-[12rem] truncate py-2 pr-3 font-medium text-lf-text-secondary">
                    {r.label}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{r.total}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.won}</td>
                  <td className="py-2 tabular-nums text-lf-text">
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
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm shadow-black/8 ${className}`}
    >
      {children}
    </div>
  );
}

const STAT_TOP: Record<"a" | "b" | "c" | "d" | "e" | "f", string> = {
  a: "border-t-lf-accent",
  b: "border-t-lf-link",
  c: "border-t-lf-warning",
  d: "border-t-lf-subtle",
  e: "border-t-lf-success",
  f: "border-t-lf-danger",
};

function StatCard({
  slot,
  title,
  value,
  sub,
}: {
  slot: keyof typeof STAT_TOP;
  title: string;
  value: string | number;
  sub: string;
}) {
  const border = STAT_TOP[slot];
  return (
    <Card className={`border-t-4 ${border}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-lf-subtle">
        {title}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-lf-text">{value}</p>
      <p className="mt-1 text-xs text-lf-muted">{sub}</p>
    </Card>
  );
}

export function UnifiedPortalReportSections({
  vm,
  countrySubtitle,
  leadsHref,
  recentLeadsTitle = "Recent leads",
}: {
  vm: UnifiedDashboardViewModel;
  countrySubtitle: string;
  leadsHref: string;
  recentLeadsTitle?: string;
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
    maxStageBar,
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
  } = vm;

  const overallConversion =
    total > 0 ? ((closedWon / total) * 100).toFixed(1) : "—";

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          slot="a"
          title="Total leads"
          value={total}
          sub={meta.rangeLabel === "All time" ? "In scope" : meta.rangeLabel}
        />
        <StatCard
          slot="b"
          title="Qualified"
          value={qualified}
          sub={`${qualRate}% of total`}
        />
        <StatCard
          slot="c"
          title="Not qualified"
          value={notQ}
          sub={`${total ? Math.round((notQ / total) * 100) : 0}% of total`}
        />
        <StatCard
          slot="d"
          title="Irrelevant"
          value={irrelevant}
          sub={`${total ? Math.round((irrelevant / total) * 100) : 0}% of total`}
        />
        <StatCard
          slot="e"
          title="Total won"
          value={closedWon}
          sub={`${overallConversion}% conversion (won ÷ all)`}
        />
        <StatCard
          slot="f"
          title="Total lost"
          value={closedLost}
          sub={`${pipelineInProgress} still with rep`}
        />
      </section>

      <Card>
        <h2 className="text-base font-semibold text-lf-text">
          Funnel — by sales stage
        </h2>
        <p className="mt-1 text-sm text-lf-muted">
          Counts in each stage (not duplicated above; qualification totals are
          in the KPI row).
        </p>
        <ul className="mt-6 max-w-2xl space-y-4">
          {total === 0 ? (
            <li className="text-sm text-lf-subtle">No leads in range.</li>
          ) : (
            stageEntries.map(({ stageKey, label, count }) => (
              <li key={stageKey}>
                <div className="mb-1 flex justify-between text-xs text-lf-muted">
                  <span className="font-medium text-lf-text-secondary">
                    {label}
                  </span>
                  <span className="tabular-nums text-lf-text">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-lf-bg">
                  <div
                    className="h-full rounded-full bg-lf-link"
                    style={{
                      width: `${Math.max(
                        4,
                        (count / maxStageBar) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>

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

      {atlPassed ? (
        <Card>
          <h2 className="text-base font-semibold text-lf-text">
            Qualified leads passed to sales
          </h2>
          <p className="mt-1 text-sm text-lf-muted">
            Qualified leads that have left internal routing (handed to a main
            team onward)
          </p>
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

      <Card>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-lf-text">
            {recentLeadsTitle}
          </h2>
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
                <th className="pb-3 pr-4 font-medium">Lead</th>
                <th className="pb-3 pr-4 font-medium">Creator</th>
                <th className="pb-3 pr-4 font-medium">Source</th>
                <th className="pb-3 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lf-divide">
              {recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-lf-subtle"
                  >
                    No leads in this range.
                  </td>
                </tr>
              ) : (
                recent.map((l) => (
                  <tr key={l.id} className="text-lf-muted">
                    <td className="py-3 pr-4 font-semibold text-lf-text">
                      {l.leadName || "—"}
                    </td>
                    <td className="py-3 pr-4 text-lf-text-secondary">
                      {l.createdByName}
                    </td>
                    <td className="py-3 pr-4">
                      <LeadSourcePill source={l.source} />
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

      <LeadsByCountryQualCard rows={countryRows} subtitle={countrySubtitle} />

      <LeadsByCityReportCard rows={cityRows} />

      <Card>
        <h2 className="mb-2 text-base font-semibold text-lf-text">
          Conversion ratio by dimension
        </h2>
        <p className="text-sm text-lf-muted">
          Share of <span className="font-medium text-lf-text-secondary">won</span>{" "}
          deals within each bucket (total leads in that bucket as denominator).
          Website and Meta profile use source detail fields; blanks group as —.
        </p>
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <ConversionTable title="By country (phone)" rows={conversionByCountry} />
          <ConversionTable title="By website / brand" rows={conversionByWebsite} />
          <ConversionTable
            title="By Meta profile"
            rows={conversionByProfile}
          />
          <ConversionTable title="By source" rows={conversionBySource} />
        </div>
      </Card>

      {scoreBuckets.length > 0 ? (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-lf-text">
            Lead score distribution
          </h2>
          <ul className="space-y-3">
            {scoreBuckets.map(({ label, count }) => (
              <li
                key={label}
                className="flex justify-between text-sm text-lf-muted"
              >
                <span className="text-lf-text-secondary">{label}</span>
                <span className="tabular-nums text-lf-text">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-4 text-base font-semibold text-lf-text">
          Qualified pipeline detail
        </h2>
        <p className="mt-1 text-sm text-lf-muted">
          All qualified leads in range — same rows as export “Qualified pipeline
          detail”. For closed lost, the note is the sales executive’s loss
          reason.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lf-border text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
                <th className="pb-3 pr-4 font-medium">Lead</th>
                <th className="pb-3 pr-4 font-medium">Creator</th>
                <th className="pb-3 pr-4 font-medium">Qualified on</th>
                <th className="pb-3 pr-4 font-medium">Pipeline</th>
                <th className="pb-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lf-divide">
              {pipelineQualified.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-lf-subtle"
                  >
                    No qualified leads in range.
                  </td>
                </tr>
              ) : (
                pipelineQualified.slice(0, 12).map((l) => {
                  const pill = pipelinePillForLead(
                    l.qualificationStatus,
                    l.salesStage,
                  );
                  return (
                    <tr key={l.id}>
                      <td className="py-3 pr-4 font-semibold text-lf-text">
                        {l.leadName || "—"}
                      </td>
                      <td className="py-3 pr-4 text-lf-text-secondary">
                        {l.createdByName}
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
    </div>
  );
}
