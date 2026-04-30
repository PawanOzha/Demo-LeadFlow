import { leadCreatedAtRange } from "@/lib/analyst-date-range";

/** SQL WHERE fragment for leads routed to this main team lead (optional `createdAt` range). */
export function mtlLeadSql(
  assignedMainTeamLeadId: string,
  from?: string | null,
  to?: string | null,
  leadAlias?: string,
): { clause: string; params: unknown[] } {
  const c = (col: string) => (leadAlias ? `${leadAlias}."${col}"` : `"${col}"`);
  const range = leadCreatedAtRange(from, to);
  if (!range) {
    return {
      clause: `${c("assignedMainTeamLeadId")} = $1`,
      params: [assignedMainTeamLeadId],
    };
  }
  return {
    clause: `${c("assignedMainTeamLeadId")} = $1 AND ${c("createdAt")} >= $2::timestamp AND ${c("createdAt")} <= $3::timestamp`,
    params: [assignedMainTeamLeadId, range.gte, range.lte],
  };
}
