"use client";

type Row = { label: string; count: number };

function formatMonthYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function HistogramBlock({
  title,
  subtitle,
  rows,
  barClass,
  formatLabel,
}: {
  title: string;
  subtitle: string;
  rows: Row[];
  barClass: string;
  formatLabel?: (label: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const fmt = formatLabel ?? ((s: string) => s);

  if (rows.length === 0 || rows.every((r) => r.count === 0)) {
    return (
      <div className="rounded-xl border border-lf-border bg-lf-surface/90 p-6">
        <h3 className="text-sm font-semibold text-lf-text-secondary">{title}</h3>
        <p className="mt-1 text-xs text-lf-subtle">{subtitle}</p>
        <p className="mt-6 text-sm text-lf-subtle">No data for this chart.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-lf-border bg-lf-surface/90 p-6">
      <h3 className="text-sm font-semibold text-lf-text-secondary">{title}</h3>
      <p className="mt-1 text-xs text-lf-subtle">{subtitle}</p>
      <div className="mt-6 overflow-x-auto pb-1">
        <div
          className="flex min-h-[220px] min-w-[min(100%,520px)] items-end gap-2 border-b border-lf-border px-1 pt-2"
          role="img"
          aria-label={title}
        >
          {rows.map(({ label, count }) => {
            const h = Math.max((count / max) * 100, count > 0 ? 6 : 0);
            return (
              <div
                key={label}
                className="group flex min-w-[2.25rem] flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-[180px] w-full flex-col justify-end">
                  <div
                    className={`w-full rounded-t-md shadow-sm transition ${barClass} group-hover:brightness-110`}
                    style={{ height: `${h}%` }}
                    title={`${fmt(label)}: ${count}`}
                  />
                </div>
                <span
                  className="max-w-[4.5rem] truncate text-center text-[10px] leading-tight text-lf-subtle"
                  title={fmt(label)}
                >
                  {fmt(label)}
                </span>
                <span className="text-[11px] font-medium tabular-nums text-lf-muted">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Props = {
  scoreHistogram: Row[];
  createdByMonth: Row[];
  countryHistogram: Row[];
};

export function SuperadminReportHistograms({
  scoreHistogram,
  createdByMonth,
  countryHistogram,
}: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-lf-text-secondary">
          Histograms
        </h2>
        <p className="mt-1 text-xs text-lf-subtle">
          Frequency distributions: bar height is proportional to the maximum bin
          in each chart (not across charts).
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <HistogramBlock
          title="Lead score distribution"
          subtitle="Bins by score (0–100). “No score” when not set."
          rows={scoreHistogram}
          barClass="bg-gradient-to-t from-[#1a1a1a]/85 to-lf-accent/75"
        />
        <HistogramBlock
          title="Leads created by month"
          subtitle="Count of leads by calendar month (created date)."
          rows={createdByMonth}
          barClass="bg-gradient-to-t from-[#1a1a1a]/85 to-lf-accent-hover/65"
          formatLabel={formatMonthYm}
        />
      </div>

      <HistogramBlock
        title="Top countries (lead volume)"
        subtitle="Top 16 countries by lead count (same geography rules as the table below)."
        rows={countryHistogram}
        barClass="bg-gradient-to-t from-[#1a1a1a]/85 to-lf-link/70"
      />
    </div>
  );
}
