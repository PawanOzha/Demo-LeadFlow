"use client";

import { DashboardReportExport } from "@/components/dashboard-report-export";
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";

export function SuperadminReportExport({
  payload,
}: {
  payload: DashboardExportPayload;
}) {
  return (
    <div
      className={
        "shrink-0 self-start [&_[data-dashboard-export]]:flex [&_[data-dashboard-export]]:justify-end sm:[&_[data-dashboard-export]]:justify-start " +
        // Scope to buttons inside the export control only (not any future fullscreen layers)
        "[&_[data-dashboard-export]_button]:border-lf-border [&_[data-dashboard-export]_button]:bg-lf-bg [&_[data-dashboard-export]_button]:text-lf-text " +
        "[&_[data-dashboard-export]_button:hover]:bg-lf-bg/60 [&_[data-dashboard-export]_[role=menu]]:border-lf-border [&_[data-dashboard-export]_[role=menu]]:bg-lf-surface " +
        "[&_[data-dashboard-export]_[role=menuitem]]:text-lf-text [&_[data-dashboard-export]_[role=menuitem]:hover]:bg-lf-bg/60"
      }
    >
      <DashboardReportExport payload={payload} />
    </div>
  );
}
