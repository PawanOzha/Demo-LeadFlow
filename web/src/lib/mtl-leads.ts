import { leadCreatedAtRange } from "@/lib/analyst-date-range";

/** SQL WHERE fragment for leads routed to this main team lead (optional `createdAt` range). */
export function mtlLeadSql(
  assignedMainTeamLeadId: string,
  from?: string | null,
  to?: string | null,
): { clause: string; params: unknown[] } {
  const range = leadCreatedAtRange(from, to);
  if (!range) {
    return {
      clause: `"assignedMainTeamLeadId" = $1`,
      params: [assignedMainTeamLeadId],
    };
  }
  return {
    clause: `"assignedMainTeamLeadId" = $1 AND "createdAt" >= $2::timestamp AND "createdAt" <= $3::timestamp`,
    params: [assignedMainTeamLeadId, range.gte, range.lte],
  };
}
