import { AnalyticsCountryQualList } from "@/components/analyst/analytics-country-qual-list";
import type { CountryQualRow } from "@/lib/leads-by-country-qual";

const defaultSubtitle =
  "Phone country (E.164). Each row splits qualified, not qualified, and irrelevant — same colors as qualification breakdown. Sorted by total leads; the list shows the top 10 countries by default when there are more.";

export function LeadsByCountryQualCard({
  rows,
  subtitle = defaultSubtitle,
  className = "",
}: {
  rows: CountryQualRow[];
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm ${className}`}
    >
      <h2 className="mb-1 text-base font-semibold text-lf-text">
        Leads by country
      </h2>
      <p className="mb-3 text-xs text-lf-subtle">{subtitle}</p>
      <AnalyticsCountryQualList rows={rows} />
    </div>
  );
}
