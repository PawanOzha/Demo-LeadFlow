import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { analystRangeSummaryLabel } from "@/lib/analyst-date-range";
import { atlLeadSql } from "@/lib/atl-leads";
import { UserRole } from "@/lib/constants";
import {
  buildUnifiedDashboardViewModel,
  type UnifiedDashboardViewModel,
} from "@/lib/unified-dashboard-report";

type LeadDashRow = {
  id: string;
  leadName: string;
  source: string;
  sourceWebsiteName: string | null;
  sourceMetaProfileName: string | null;
  qualificationStatus: string;
  salesStage: string;
  leadScore: number | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  createdAt: Date;
  notes: string | null;
  lostNotes: string | null;
  createdById: string;
  assignedSalesExecId: string | null;
  cb_name: string | null;
  cb_email: string | null;
  se_name: string | null;
};

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
      : await dbQuery<LeadDashRow>(
          `SELECT l.*, cb.name AS cb_name, cb.email AS cb_email, se.name AS se_name
           FROM "Lead" l
           LEFT JOIN "User" cb ON cb.id = l."createdById"
           LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
           WHERE ${clause}
           ORDER BY l."createdAt" DESC`,
          params,
        );

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
