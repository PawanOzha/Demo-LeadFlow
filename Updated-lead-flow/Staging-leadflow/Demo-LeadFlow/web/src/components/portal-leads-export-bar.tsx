"use client";

import { DashboardReportExport } from "@/components/dashboard-report-export";
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";
import type { PortalExportScope } from "@/lib/portal-export-scope";

export function PortalLeadsExportBar({
  payload,
  description,
  compact,
  exportScope,
}: {
  payload: DashboardExportPayload;
  /** Omit or pass empty string for no copy (default: none). */
  description?: string;
  /** Only the export control — for table toolbars. */
  compact?: boolean;
  exportScope: PortalExportScope;
}) {
  if (compact) {
    return (
      <DashboardReportExport payload={payload} exportScope={exportScope} />
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-lf-border bg-lf-surface p-5 shadow-sm">
      {description ? (
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-lf-subtle">
            Export leads
          </p>
          <p className="mt-1 text-sm text-lf-muted">{description}</p>
        </div>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wider text-lf-subtle">
          Export leads
        </p>
      )}
      <div className="shrink-0">
        <DashboardReportExport payload={payload} exportScope={exportScope} />
      </div>
    </div>
  );
}
