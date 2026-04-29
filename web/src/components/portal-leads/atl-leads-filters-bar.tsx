"use client";

import { useRouter, usePathname } from "next/navigation";
import { QualificationStatus } from "@/lib/constants";

export type AtlAnalystFilterOption = { id: string; name: string };

type Props = {
  /** From server — keeps SSR and client markup aligned. */
  status: string | null;
  analystId: string | null;
  source: string | null;
  analystOptions: AtlAnalystFilterOption[];
  sourceOptions: string[];
};

/**
 * Merges filter changes into the current URL so `q` / `perPage` are preserved
 * (including while name search is debounced).
 */
export function AtlLeadsFiltersBar({
  status,
  analystId,
  source,
  analystOptions,
  sourceOptions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function go(updates: {
    status?: string | null;
    analystId?: string | null;
    source?: string | null;
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
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
      <p className="mb-0 px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        Filters
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-gray-500">
          Status
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-900"
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
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-gray-500">
          Lead analyst
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-900"
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
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-[12px] font-medium uppercase tracking-wide text-gray-500">
          Source
          <select
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-900"
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
      </div>
    </div>
  );
}
