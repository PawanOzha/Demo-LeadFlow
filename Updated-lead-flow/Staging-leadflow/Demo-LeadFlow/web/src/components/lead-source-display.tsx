"use client";

import { formatLeadSourceDisplay } from "@/lib/lead-sources";

/** Plain text; truncates with full value in `title` for long sources. */
export function LeadSourceDisplay({ source }: { source: string }) {
  const s = formatLeadSourceDisplay(source);
  return (
    <span
      className="block min-w-0 max-w-full truncate align-top text-left"
      title={s}
    >
      {s}
    </span>
  );
}

/** Compact pill for tables and reports. */
export function LeadSourcePill({ source }: { source: string }) {
  const s = formatLeadSourceDisplay(source);
  return (
    <span
      className="inline-flex items-center min-w-0 max-w-full truncate rounded-full border border-lf-brand/30 bg-lf-brand/15 px-2.5 py-0.5 text-left text-[11px] font-medium leading-snug text-lf-brand"
      title={s}
    >
      {s}
    </span>
  );
}
