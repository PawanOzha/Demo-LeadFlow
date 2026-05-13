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
      className={`flex h-full flex-col rounded-2xl border border-lf-border/70 bg-lf-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] dark:bg-lf-surface/90 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_28px_-14px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="mb-4 border-b border-lf-border/60 pb-4">
        <h2 className="text-base font-semibold tracking-tight text-lf-text">
          Leads by country
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-lf-subtle">
          {subtitle}
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <AnalyticsCountryQualList rows={rows} />
      </div>
    </div>
  );
}
