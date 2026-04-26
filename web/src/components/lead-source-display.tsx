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
      className="block min-w-0 max-w-full truncate rounded-full bg-lf-brand/10 px-2.5 py-0.5 text-left text-xs font-medium leading-snug text-lf-text-secondary ring-1 ring-lf-brand/20"
      title={s}
    >
      {s}
    </span>
  );
}
