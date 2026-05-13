import type { ReactNode } from "react";

/** Single card wrapping dashboard toolbar rows (actions, date range, search, filters). */
export function PortalDashboardTopPanel({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
      <div className="divide-y divide-lf-border">{children}</div>
    </div>
  );
}

/** First row: date range (left) and toolbar actions e.g. Export, Members (right). */
export function PortalDashboardTopPanelDateRow({
  start,
  end,
}: {
  start: ReactNode;
  end?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
      <div className="min-w-0 flex-1">{start}</div>
      {end ? (
        <div className="flex w-full shrink-0 flex-wrap items-end justify-end gap-2 sm:w-auto">
          {end}
        </div>
      ) : null}
    </div>
  );
}

/** Stand-alone actions row (e.g. when no date bar on the page). */
export function PortalDashboardTopPanelActions({
  start,
  end,
}: {
  start?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="min-w-0 flex-1">{start ?? null}</div>
      {end ? (
        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
          {end}
        </div>
      ) : null}
    </div>
  );
}
