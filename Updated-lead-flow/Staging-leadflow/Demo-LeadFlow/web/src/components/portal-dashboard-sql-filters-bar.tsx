"use client";

import { useRouter } from "next/navigation";
import { QualificationStatus, SalesStage } from "@/lib/constants";

const SALES_STAGE_ORDER = [
  SalesStage.PRE_SALES,
  SalesStage.WITH_TEAM_LEAD,
  SalesStage.WITH_EXECUTIVE,
  SalesStage.CLOSED_WON,
  SalesStage.CLOSED_LOST,
] as const;

type Props = {
  navigatePathname: string;
  status: string | null;
  salesStage: string | null;
  source: string | null;
  website?: string | null;
  sourceOptions: string[];
  websiteOptions?: string[];
  /** No outer card or “Filters” label; nest inside {@link PortalDashboardTopPanel}. */
  embedded?: boolean;
};

/**
 * Qualification + pipeline stage + source + website filters for MTL / executive dashboards.
 * Updates the URL in one navigation (server re-fetches bundle — same pattern as ATL leads filters).
 */
export function PortalDashboardSqlFiltersBar({
  navigatePathname,
  status,
  salesStage,
  source,
  website = null,
  sourceOptions,
  websiteOptions = [],
  embedded = false,
}: Props) {
  const router = useRouter();

  function go(updates: {
    status?: string | null;
    salesStage?: string | null;
    source?: string | null;
    website?: string | null;
  }) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if ("status" in updates) {
      if (updates.status) params.set("status", updates.status);
      else params.delete("status");
    }
    if ("salesStage" in updates) {
      if (updates.salesStage) params.set("salesStage", updates.salesStage);
      else params.delete("salesStage");
    }
    if ("source" in updates) {
      if (updates.source) params.set("source", updates.source);
      else params.delete("source");
    }
    if ("website" in updates) {
      if (updates.website) params.set("website", updates.website);
      else params.delete("website");
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${navigatePathname}?${qs}` : navigatePathname);
  }

  return (
    <div
      className={
        embedded
          ? "flex flex-col gap-3 px-3 py-3 sm:px-4 sm:flex-row sm:flex-wrap sm:items-end"
          : "flex flex-col gap-3 rounded-xl border border-lf-border bg-lf-surface p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      }
    >
      {embedded ? null : (
        <p className="mb-0 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-lf-muted sm:pt-1">
          Filters
        </p>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-lf-muted">
          Status
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lf-brand"
            value={status ?? ""}
            onChange={(e) => go({ status: e.target.value || null })}
          >
            <option value="">All</option>
            <option value={QualificationStatus.QUALIFIED}>Qualified</option>
            <option value={QualificationStatus.NOT_QUALIFIED}>Not qualified</option>
            <option value={QualificationStatus.IRRELEVANT}>Irrelevant</option>
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-lf-muted">
          Sales stage
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lf-brand"
            value={salesStage ?? ""}
            onChange={(e) => go({ salesStage: e.target.value || null })}
          >
            <option value="">All</option>
            {SALES_STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-lf-muted">
          Source
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lf-brand"
            value={source ?? ""}
            onChange={(e) => go({ source: e.target.value || null })}
          >
            <option value="">All</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-lf-muted">
          Website / brand
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lf-brand"
            value={website ?? ""}
            onChange={(e) => go({ website: e.target.value || null })}
          >
            <option value="">All</option>
            {websiteOptions.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
