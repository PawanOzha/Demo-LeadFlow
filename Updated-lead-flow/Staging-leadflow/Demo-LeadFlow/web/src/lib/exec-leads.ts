import { parseLeadFilters } from "@/lib/server/leads/filter-parser";
import { buildLeadWhereClause } from "@/lib/server/leads/where-builder";

/** SQL WHERE for leads assigned to this sales executive (optional `createdAt` range). */
export function execLeadSql(
  assignedSalesExecId: string,
  from?: string | null,
  to?: string | null,
  leadAlias?: string,
  qRaw?: string | null,
): { clause: string; params: unknown[] } {
  const c = (col: string) => (leadAlias ? `${leadAlias}."${col}"` : `"${col}"`);
  const parsed = parseLeadFilters({
    from: from ?? undefined,
    to: to ?? undefined,
    q: qRaw ?? undefined,
  });
  const where = buildLeadWhereClause(parsed, 2, leadAlias ?? "l");
  return {
    clause: `${c("assignedSalesExecId")} = $1 ${where.clause}`,
    params: [assignedSalesExecId, ...where.params],
  };
}
