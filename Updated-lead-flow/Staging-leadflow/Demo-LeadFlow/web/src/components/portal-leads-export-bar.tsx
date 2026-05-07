"use client";

import { DashboardReportExport } from "@/components/dashboard-report-export";
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";

export function PortalLeadsExportBar({
  payload,
  description = "PDF, Excel, or CSV for every lead matching the date range above (and your search filter), up to the export row limit shown in the summary.",
}: {
  payload: DashboardExportPayload;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-lf-border bg-lf-surface p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-lf-subtle">
          Export leads
        </p>
        <p className="mt-1 text-sm text-lf-muted">{description}</p>
      </div>
      <div className="shrink-0">
        <DashboardReportExport payload={payload} />
      </div>
    </div>
  );
}
