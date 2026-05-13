"use client";

import { useRouter, usePathname } from "next/navigation";
import { QualificationStatus } from "@/lib/constants";

export type AtlAnalystFilterOption = { id: string; name: string };

type Props = {
  /** From server — keeps SSR and client markup aligned. */
  status: string | null;
  analystId: string | null;
  source: string | null;
  website?: string | null;
  analystOptions: AtlAnalystFilterOption[];
  sourceOptions: string[];
  websiteOptions?: string[];
  variant?: "topbar" | "sidebar";
  /** When set, push filters onto this path (e.g. `/analyst-team-lead` dashboard) instead of the current URL. */
  navigatePathname?: string;
  /** No outer card or “Filters” label (topbar only); nest inside {@link PortalDashboardTopPanel}. */
  embedded?: boolean;
};

/**
 * Merges filter changes into the current URL so `q` / `perPage` are preserved
 * (including while name search is debounced).
 */
export function AtlLeadsFiltersBar({
  status,
  analystId,
  source,
  website = null,
  analystOptions,
  sourceOptions,
  websiteOptions = [],
  variant = "topbar",
  navigatePathname,
  embedded = false,
}: Props) {
  const router = useRouter();
  const pathnameFromRoute = usePathname();
  const pathname = navigatePathname ?? pathnameFromRoute;
  const isSidebar = variant === "sidebar";
  const isEmbeddedTopbar = embedded && !isSidebar;

  function go(updates: {
    status?: string | null;
    analystId?: string | null;
    source?: string | null;
    website?: string | null;
  }) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if ("status" in updates) {
      if (updates.status) params.set("status", updates.status);
      else params.delete("status");
    }
    if ("analystId" in updates) {
      if (updates.analystId) params.set("analystId", updates.analystId);
      else params.delete("analystId");
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
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className={
        isEmbeddedTopbar
          ? "flex flex-col gap-3 px-3 py-3 sm:px-4 sm:flex-row sm:flex-wrap sm:items-end"
          : isSidebar
            ? "rounded-xl border border-lf-border bg-lf-surface p-4 shadow-sm"
            : "flex flex-col gap-3 rounded-xl border border-lf-border bg-lf-surface p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      }
    >
      {isEmbeddedTopbar ? null : (
        <p
          className={
            isSidebar
              ? "mb-0 pb-2 text-[11px] font-semibold uppercase tracking-widest text-lf-muted"
              : "mb-0 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-lf-muted sm:pt-1"
          }
        >
          Filters
        </p>
      )}
      <div
        className={
          isSidebar
            ? "grid grid-cols-1 gap-3"
            : "flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        }
      >
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-lf-muted">
          Status
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lf-brand"
            value={status ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              go({ status: v || null });
            }}
          >
            <option value="">All</option>
            <option value={QualificationStatus.QUALIFIED}>Qualified</option>
            <option value={QualificationStatus.NOT_QUALIFIED}>
              Not qualified
            </option>
            <option value={QualificationStatus.IRRELEVANT}>Irrelevant</option>
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-lf-muted">
          Lead analyst
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lf-brand"
            value={analystId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              go({ analystId: v || null });
            }}
            disabled={analystOptions.length === 0}
          >
            <option value="">All</option>
            {analystOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-lf-muted">
          Source
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lf-brand"
            value={source ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              go({ source: v || null });
            }}
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
            onChange={(e) => {
              const v = e.target.value;
              go({ website: v || null });
            }}
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
