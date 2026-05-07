import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { analystRangeSummaryLabel } from "@/lib/analyst-date-range";
import { atlLeadSql } from "@/lib/atl-leads";
import { UserRole } from "@/lib/constants";
import {
  buildUnifiedDashboardViewModel,
  type UnifiedDashboardViewModel,
} from "@/lib/unified-dashboard-report";
import { fetchReportLeadDashRowsJoined } from "@/lib/report-joined-leads-fetch";

export type AtlTeamLeadSession = {
  id: string;
  name: string;
  email: string;
};

/** Builds the unified dashboard view model for the ATL portal for the given createdAt range (null = all time). */
export async function buildAtlTeamLeadDashboardViewModel(
  session: AtlTeamLeadSession,
  from: string | null,
  to: string | null,
): Promise<{
  vm: UnifiedDashboardViewModel;
  analystsList: { id: string; name: string }[];
  analystIds: string[];
  teamCount: number;
  rangeLabel: string;
}> {
  const analystsList = await dbQuery<{ id: string; name: string }>(
    `SELECT id, name FROM "User" WHERE "managerId" = $1 AND role = $2 ORDER BY name ASC`,
    [session.id, UserRole.LEAD_ANALYST],
  );
  const analystIds = analystsList.map((a) => a.id);

  const { clause, params } = atlLeadSql(analystIds, from, to, null, "l");
  const leads =
    analystIds.length === 0
      ? []
      : await fetchReportLeadDashRowsJoined(clause, params, "desc");

  const teamCountRow = await dbQueryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Team"`,
  );
  const teamCount = Number(teamCountRow?.c ?? 0);
  const generatedAt = new Date().toISOString();
  const rangeLabel = analystRangeSummaryLabel(from, to);

  const unifiedRows = leads.map((l) => ({
    id: l.id,
    leadName: l.leadName,
    source: l.source,
    sourceWebsiteName: l.sourceWebsiteName,
    sourceMetaProfileName: l.sourceMetaProfileName,
    qualificationStatus: l.qualificationStatus,
    salesStage: l.salesStage,
    leadScore: l.leadScore,
    phone: l.phone,
    country: l.country,
    city: l.city,
    createdAt: l.createdAt,
    notes: l.notes,
    lostNotes: l.lostNotes,
    createdById: l.createdById,
    createdByEmail: l.cb_email ?? "",
    createdByName: l.cb_name ?? "Unknown analyst",
    assignedSalesExecId: l.assignedSalesExecId,
    assignedRepName: l.se_name ?? null,
  }));

  const vm = buildUnifiedDashboardViewModel(unifiedRows, {
    kind: "analyst_team_lead",
    rangeLabel,
    generatedAt,
    fileNamePrefix: "leadflow-dashboard",
    reportTitle: "LeadFlow dashboard report",
    reportSubtitle: `ATL · ${session.name} · ${analystsList.length} analyst${analystsList.length === 1 ? "" : "s"}`,
    analystName: session.name,
    analystEmail: session.email,
    analystCount: analystsList.length,
    teamCount,
  });

  return { vm, analystsList, analystIds, teamCount, rangeLabel };
}
