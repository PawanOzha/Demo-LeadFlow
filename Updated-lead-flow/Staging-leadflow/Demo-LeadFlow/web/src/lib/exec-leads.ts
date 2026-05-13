import type { LeadFilters } from "@/lib/server/leads/filter-parser";
import { buildLeadWhereClause } from "@/lib/server/leads/where-builder";

/** SQL WHERE for leads assigned to this sales executive. */
export function execLeadSql(
  assignedSalesExecId: string,
  filters: LeadFilters,
  leadAlias = "l",
): { clause: string; params: unknown[] } {
  const c = (col: string) => (leadAlias ? `${leadAlias}."${col}"` : `"${col}"`);
  const scoped: LeadFilters = { ...filters };
  delete scoped.assignedExecId;
  delete scoped.assignedMtlId;
  delete scoped.teamId;
  const where = buildLeadWhereClause(scoped, 2, leadAlias);
  return {
    clause: `${c("assignedSalesExecId")} = $1${where.clause ? ` ${where.clause}` : ""}`,
    params: [assignedSalesExecId, ...where.params],
  };
}
