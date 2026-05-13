"use client";

import { useState } from "react";

import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";

import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";

/** Debounced `q` on a fixed dashboard pathname (shareable URL; preserves other params). */

export function PortalDashboardSearchBar({
  initialQ,
  pathname,
  showLabel = true,
  /** No outer card; nest inside {@link PortalDashboardTopPanel}. */
  embedded = false,
  /** With `embedded`, skip inner padding when the field sits beside the date bar in the same panel row. */
  nestInPanelRow = false,
}: {
  initialQ: string | null;
  pathname: string;
  /** When false, only the search control (e.g. above lead tables that already have a filter row). */
  showLabel?: boolean;
  embedded?: boolean;
  nestInPanelRow?: boolean;
}) {
  const [query, setQuery] = useState(initialQ ?? "");

  useDebouncedLeadSearchUrl(query, 400, pathname);

  if (embedded) {
    const field = (
      <PortalLeadSearchLiveField variant="inline" value={query} onChange={setQuery} />
    );
    if (nestInPanelRow) {
      return field;
    }
    return (
      <div className="px-3 py-2 sm:px-4">
        {field}
      </div>
    );
  }

  if (!showLabel) {
    return (
      <div className="rounded-lg border border-lf-border bg-lf-surface px-3 py-2 shadow-sm">
        <PortalLeadSearchLiveField variant="inline" value={query} onChange={setQuery} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-lf-border bg-lf-surface p-4 shadow-sm">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-lf-muted">
        Filters
      </p>
      <PortalLeadSearchLiveField value={query} onChange={setQuery} />
    </div>
  );
}
