import type { CityCountRow } from "@/lib/leads-by-country-qual";

export function LeadsByCityReportCard({
  rows,
}: {
  rows: CityCountRow[];
}) {
  return (
    <div className="rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-lf-text">
        Leads by city
      </h2>
      <p className="mb-4 text-xs text-lf-subtle">
        Optional city from add lead, with phone-derived country. Shown here and
        in exported reports only — not on the lead list.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-lf-subtle">No leads in this range.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
          {rows.slice(0, 20).map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between gap-3 border-b border-lf-border pb-2 last:border-0"
            >
              <span className="min-w-0 truncate text-lf-text-secondary">{r.label}</span>
              <span className="shrink-0 tabular-nums text-lf-text">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 20 ? (
        <p className="mt-3 text-xs text-lf-subtle">
          Showing top 20 rows by count. Export includes all.
        </p>
      ) : null}
    </div>
  );
}
