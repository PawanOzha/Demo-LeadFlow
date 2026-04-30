import type { JourneyLead } from "@/lib/superadmin-stats";
import type { PortalSuperadminLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { parseDbDate } from "@/lib/analyst-ui";
import { coerceMoney } from "@/lib/deal-money";

function toIsoOrEmpty(value: unknown): string {
  const d = parseDbDate(value);
  return d ? d.toISOString() : "";
}

export function flattenSuperadminJourneyGroupsForExport(
  groups: { leads: JourneyLead[] }[],
): PortalSuperadminLeadExportRow[] {
  const rows: PortalSuperadminLeadExportRow[] = [];
  for (const g of groups) {
    for (const lead of g.leads) {
      const logs = lead.handoffLogs;
      const handoffSummary =
        logs.length === 0
          ? ""
          : `${logs
              .slice(0, 12)
              .map((h) => `${h.action} @ ${toIsoOrEmpty(h.createdAt)}`)
              .join(" · ")}${logs.length > 12 ? ` … (+${logs.length - 12} more)` : ""}`;

      rows.push({
        leadName: lead.leadName,
        phone: lead.phone,
        leadEmail: lead.leadEmail,
        country: lead.country,
        city: lead.city,
        source: lead.source,
        notes: lead.notes,
        lostNotes: lead.lostNotes,
        qualificationStatus: lead.qualificationStatus,
        leadScore: lead.leadScore,
        salesStage: lead.salesStage,
        createdAt: toIsoOrEmpty(lead.createdAt),
        createdByLabel: `${lead.createdBy.name} (${lead.createdBy.email})`,
        teamName: lead.team?.name ?? null,
        mtlLabel: lead.assignedMainTeamLead
          ? `${lead.assignedMainTeamLead.name} (${lead.assignedMainTeamLead.email})`
          : null,
        execLabel: lead.assignedSalesExec
          ? `${lead.assignedSalesExec.name} (${lead.assignedSalesExec.email})`
          : null,
        handoffSummary,
        estimatedDealValue: coerceMoney(lead.estimatedDealValue),
        closedRevenue: coerceMoney(lead.closedRevenue),
        dealCurrency: lead.dealCurrency?.trim() || "USD",
      });
    }
  }
  return rows;
}
