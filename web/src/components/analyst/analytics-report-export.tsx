import { DashboardReportExport } from "@/components/dashboard-report-export";
import { analystAnalyticsToDashboardExport } from "@/lib/dashboard-export-mappers";
import type { AnalystAnalyticsReportPayload } from "@/lib/analytics-report-types";

export function AnalyticsReportExport({
  payload,
}: {
  payload: AnalystAnalyticsReportPayload;
}) {
  return (
    <DashboardReportExport
      payload={analystAnalyticsToDashboardExport(payload)}
    />
  );
}
