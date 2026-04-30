import { leadCreatedAtRange } from "@/lib/analyst-date-range";

/** SQL WHERE for leads assigned to this sales executive (optional `createdAt` range). */
export function execLeadSql(
  assignedSalesExecId: string,
  from?: string | null,
  to?: string | null,
  leadAlias?: string,
): { clause: string; params: unknown[] } {
  const c = (col: string) => (leadAlias ? `${leadAlias}."${col}"` : `"${col}"`);
  const range = leadCreatedAtRange(from, to);
  if (!range) {
    return {
      clause: `${c("assignedSalesExecId")} = $1`,
      params: [assignedSalesExecId],
    };
  }
  return {
    clause: `${c("assignedSalesExecId")} = $1 AND ${c("createdAt")} >= $2::timestamp AND ${c("createdAt")} <= $3::timestamp`,
    params: [assignedSalesExecId, range.gte, range.lte],
  };
}
