"use client";

type Props = {
  totalLeads: number;
  qualified: number;
  notQualified: number;
  irrelevant: number;
  closedWon: number;
  closedLost: number;
};

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return (n / d) * 100;
}

export function SuperadminReportCharts({
  totalLeads,
  qualified,
  notQualified,
  irrelevant,
  closedWon,
  closedLost,
}: Props) {
  const qSum = qualified + notQualified + irrelevant;
  const closedSum = closedWon + closedLost;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-xl border border-lf-border bg-lf-surface/90 p-6">
        <h3 className="text-sm font-semibold text-lf-text-secondary">
          Closed outcomes (won vs lost)
        </h3>
        <p className="mt-1 text-xs text-lf-subtle">
          Share among closed deals only (won + lost). No closed row when both
          are zero.
        </p>
        {closedSum === 0 ? (
          <p className="mt-4 text-sm text-lf-subtle">No closed leads yet.</p>
        ) : (
          <>
            <div className="mt-4 flex h-10 overflow-hidden rounded-lg ring-1 ring-lf-border">
              <div
                className="flex items-center justify-center bg-lf-success/90 text-xs font-medium text-lf-on-accent"
                style={{ width: `${pct(closedWon, closedSum)}%` }}
                title={`Won: ${closedWon}`}
              >
                {pct(closedWon, closedSum) >= 12 ? `Won ${closedWon}` : ""}
              </div>
              <div
                className="flex items-center justify-center bg-lf-danger/85 text-xs font-medium text-lf-on-accent"
                style={{ width: `${pct(closedLost, closedSum)}%` }}
                title={`Lost: ${closedLost}`}
              >
                {pct(closedLost, closedSum) >= 12 ? `Lost ${closedLost}` : ""}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-lf-muted">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-lf-success" />
                Won: {closedWon} (
                {pct(closedWon, closedSum).toFixed(1)}% of closed)
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-lf-danger" />
                Lost: {closedLost} (
                {pct(closedLost, closedSum).toFixed(1)}% of closed)
              </span>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-lf-border bg-lf-surface/90 p-6">
        <h3 className="text-sm font-semibold text-lf-text-secondary">
          Qualification mix (all leads)
        </h3>
        <p className="mt-1 text-xs text-lf-subtle">
          Qualified, not qualified, and irrelevant as a share of total leads.
        </p>
        {totalLeads === 0 || qSum === 0 ? (
          <p className="mt-4 text-sm text-lf-subtle">No leads yet.</p>
        ) : (
          <>
            <div className="mt-4 flex h-10 overflow-hidden rounded-lg ring-1 ring-lf-border">
              <div
                className="flex min-w-0 items-center justify-center bg-lf-success/85 text-[11px] font-medium text-lf-on-accent"
                style={{ width: `${pct(qualified, totalLeads)}%` }}
              >
                {pct(qualified, totalLeads) >= 10 ? "Q" : ""}
              </div>
              <div
                className="flex min-w-0 items-center justify-center bg-lf-warning/85 text-[11px] font-medium text-lf-on-accent"
                style={{ width: `${pct(notQualified, totalLeads)}%` }}
              >
                {pct(notQualified, totalLeads) >= 10 ? "NQ" : ""}
              </div>
              <div
                className="flex min-w-0 items-center justify-center bg-lf-muted text-[11px] font-medium text-lf-on-accent"
                style={{ width: `${pct(irrelevant, totalLeads)}%` }}
              >
                {pct(irrelevant, totalLeads) >= 10 ? "I" : ""}
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-lf-muted">
              <div className="flex justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-lf-success" />
                  Qualified
                </span>
                <span>
                  {qualified} ({pct(qualified, totalLeads).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-lf-warning" />
                  Not qualified
                </span>
                <span>
                  {notQualified} ({pct(notQualified, totalLeads).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-lf-subtle" />
                  Irrelevant
                </span>
                <span>
                  {irrelevant} ({pct(irrelevant, totalLeads).toFixed(1)}%)
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
