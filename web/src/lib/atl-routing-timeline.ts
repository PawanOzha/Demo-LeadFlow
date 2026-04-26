import { dbQuery } from "@/lib/db/pool";
import { LeadHandoffAction } from "@/lib/constants";

export type AtlRoutingTimeline = {
  routedToMainTeamAt: Date | null;
  assignedToExecutiveAt: Date | null;
  directAssignedToExecutiveByAtlAt: Date | null;
};

/** First occurrence per action from handoff log (same rules as ATL leads table). */
export async function fetchAtlRoutingTimelines(
  leadIds: string[],
): Promise<Map<string, AtlRoutingTimeline>> {
  const timelineByLead = new Map<string, AtlRoutingTimeline>();
  if (leadIds.length === 0) return timelineByLead;

  const handoffRows = await dbQuery<{
    lead_id: string;
    created_at: Date;
    action: string;
  }>(
    `SELECT "leadId" AS lead_id, "createdAt" AS created_at, action
     FROM "LeadHandoffLog"
     WHERE "leadId" = ANY($1::text[])
       AND action = ANY($2::text[])
     ORDER BY "createdAt" ASC`,
    [
      leadIds,
      [
        LeadHandoffAction.ROUTED_TO_MAIN_TEAM,
        LeadHandoffAction.ASSIGNED_TO_EXECUTIVE,
        LeadHandoffAction.DIRECT_ASSIGNED_TO_EXECUTIVE_BY_ATL,
      ],
    ],
  );

  const partial = new Map<
    string,
    {
      routedToMainTeamAt?: Date;
      assignedToExecutiveAt?: Date;
      directAssignedToExecutiveByAtlAt?: Date;
    }
  >();

  for (const h of handoffRows) {
    const t = partial.get(h.lead_id) ?? {};
    if (
      h.action === LeadHandoffAction.ROUTED_TO_MAIN_TEAM &&
      !t.routedToMainTeamAt
    ) {
      t.routedToMainTeamAt = h.created_at;
    } else if (
      h.action === LeadHandoffAction.ASSIGNED_TO_EXECUTIVE &&
      !t.assignedToExecutiveAt
    ) {
      t.assignedToExecutiveAt = h.created_at;
    } else if (
      h.action === LeadHandoffAction.DIRECT_ASSIGNED_TO_EXECUTIVE_BY_ATL &&
      !t.directAssignedToExecutiveByAtlAt
    ) {
      t.directAssignedToExecutiveByAtlAt = h.created_at;
    }
    partial.set(h.lead_id, t);
  }

  for (const id of leadIds) {
    const t = partial.get(id) ?? {};
    timelineByLead.set(id, {
      routedToMainTeamAt: t.routedToMainTeamAt ?? null,
      assignedToExecutiveAt: t.assignedToExecutiveAt ?? null,
      directAssignedToExecutiveByAtlAt:
        t.directAssignedToExecutiveByAtlAt ?? null,
    });
  }

  return timelineByLead;
}
