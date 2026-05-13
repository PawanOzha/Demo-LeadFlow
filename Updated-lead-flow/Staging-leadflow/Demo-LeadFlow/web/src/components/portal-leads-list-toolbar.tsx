"use client";

import type { ReactNode } from "react";

/** Single header row above wide lead tables: pagination + optional search + trailing actions (e.g. export). */
export function PortalLeadsListToolbar({
  pagination,
  search,
  trailing,
}: {
  pagination: ReactNode;
  search?: ReactNode;
  /** Optional trailing actions (e.g. export). Omit when controls live in the parent panel. */
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-lf-border bg-lf-bg/90 px-3 py-2.5">
      <div className="min-w-0 flex-1 basis-[min(100%,420px)]">{pagination}</div>
      {search ? (
        <div className="min-w-[11rem] max-w-[20rem] flex-1">{search}</div>
      ) : null}
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}
