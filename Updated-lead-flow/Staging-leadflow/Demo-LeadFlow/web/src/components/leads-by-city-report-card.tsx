import type { CityCountRow } from "@/lib/leads-by-country-qual";

export function LeadsByCityReportCard({
  rows,
}: {
  rows: CityCountRow[];
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-lf-border/80 bg-lf-surface p-6 shadow-sm shadow-black/[0.04] dark:bg-lf-surface/90">
      <div className="mb-4 border-b border-lf-border/60 pb-4">
        <h2 className="text-base font-semibold tracking-tight text-lf-text">
          Leads by city
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-lf-subtle">
          Optional city from add lead, with phone-derived country. Shown here and
          in exported reports only — not on the lead list.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-lf-subtle">
          No leads in this range.
        </p>
      ) : (
        <ul
          className="max-h-80 divide-y divide-lf-border/50 overflow-y-auto rounded-lg border border-lf-border/50 bg-lf-bg/30 text-sm dark:bg-lf-elevated/15"
          role="list"
        >
          {rows.slice(0, 20).map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-lf-surface/90 dark:hover:bg-lf-elevated/30"
              role="listitem"
            >
              <span className="min-w-0 flex-1 truncate text-lf-text-secondary">
                {r.label}
              </span>
              <span className="shrink-0 rounded-md bg-lf-surface/90 px-2 py-0.5 text-xs font-medium tabular-nums text-lf-text shadow-sm ring-1 ring-lf-border/50 dark:bg-lf-elevated/50">
                {r.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 20 ? (
        <p className="mt-4 border-t border-lf-border/60 pt-4 text-center text-[11px] text-lf-subtle">
          Showing top 20 cities by count. Export includes all.
        </p>
      ) : null}
    </div>
  );
}
