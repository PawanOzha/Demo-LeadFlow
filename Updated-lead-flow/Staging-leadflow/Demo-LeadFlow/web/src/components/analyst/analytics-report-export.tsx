import { DashboardReportExport } from "@/components/dashboard-report-export";
import { analystAnalyticsToDashboardExport } from "@/lib/dashboard-export-mappers";
import type { AnalystAnalyticsReportPayload } from "@/lib/analytics-report-types";
import type { PortalExportScope } from "@/lib/portal-export-scope";

export function AnalyticsReportExport({
  payload,
  exportScope = { hasActiveFilters: true, bulletLines: ["Filters apply to this analytics export."] },
}: {
  payload: AnalystAnalyticsReportPayload;
  exportScope?: PortalExportScope;
}) {
  return (
    <DashboardReportExport
      payload={analystAnalyticsToDashboardExport(payload)}
      exportScope={exportScope}
    />
  );
}
