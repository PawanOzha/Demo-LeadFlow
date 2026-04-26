"use client";

import { DashboardReportExport } from "@/components/dashboard-report-export";
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";

export function SuperadminUsersExportBar({
  payload,
  description = "PDF, Excel, or CSV for every user listed in this table.",
}: {
  payload: DashboardExportPayload;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-lf-border bg-lf-surface px-4 py-4 shadow-sm sm:px-5 sm:py-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-lf-subtle">
          Export users
        </p>
        <p className="mt-1 text-sm text-lf-muted">{description}</p>
      </div>
      <div className="shrink-0">
        <DashboardReportExport payload={payload} />
      </div>
    </div>
  );
}
