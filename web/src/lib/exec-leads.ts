import { leadCreatedAtRange } from "@/lib/analyst-date-range";

/** SQL WHERE for leads assigned to this sales executive (optional `createdAt` range). */
export function execLeadSql(
  assignedSalesExecId: string,
  from?: string | null,
  to?: string | null,
): { clause: string; params: unknown[] } {
  const range = leadCreatedAtRange(from, to);
  if (!range) {
    return {
      clause: `"assignedSalesExecId" = $1`,
      params: [assignedSalesExecId],
    };
  }
  return {
    clause: `"assignedSalesExecId" = $1 AND "createdAt" >= $2::timestamp AND "createdAt" <= $3::timestamp`,
    params: [assignedSalesExecId, range.gte, range.lte],
  };
}
