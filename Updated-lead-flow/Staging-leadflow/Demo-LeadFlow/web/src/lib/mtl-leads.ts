import type { LeadFilters } from "@/lib/server/leads/filter-parser";
import { buildLeadWhereClause } from "@/lib/server/leads/where-builder";

/** SQL WHERE fragment for leads routed to this main team lead. */
export function mtlLeadSql(
  assignedMainTeamLeadId: string,
  filters: LeadFilters,
  leadAlias = "l",
): { clause: string; params: unknown[] } {
  const c = (col: string) => (leadAlias ? `${leadAlias}."${col}"` : `"${col}"`);
  const scoped: LeadFilters = { ...filters };
  delete scoped.assignedMtlId;
  delete scoped.assignedExecId;
  delete scoped.teamId;
  const where = buildLeadWhereClause(scoped, 2, leadAlias);
  return {
    clause: `${c("assignedMainTeamLeadId")} = $1${where.clause ? ` ${where.clause}` : ""}`,
    params: [assignedMainTeamLeadId, ...where.params],
  };
}
