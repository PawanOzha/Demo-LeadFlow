import type { LeadFilters } from "@/lib/server/leads/filter-parser";
import { buildLeadSmartSearchOrClause } from "@/lib/server/leads/smart-q-sql";

export interface WhereClauseResult {
  clause: string;
  params: unknown[];
  nextIndex: number;
}

export function buildLeadWhereClause(
  filters: LeadFilters,
  startIndex: number,
  tableAlias = "l",
): WhereClauseResult {
  const qcol = (column: string) => `${tableAlias}."${column}"`;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = startIndex;

  if (filters.q) {
    const smart = buildLeadSmartSearchOrClause(filters.q, idx, tableAlias);
    if (smart) {
      conditions.push(smart.clause);
      params.push(...smart.params);
      idx = smart.nextIndex;
    }
  }

  if (filters.status) {
    conditions.push(`${qcol("qualificationStatus")} = $${idx}`);
    params.push(filters.status);
    idx += 1;
  }

  if (filters.salesStage) {
    conditions.push(`${qcol("salesStage")} = $${idx}`);
    params.push(filters.salesStage);
    idx += 1;
  }

  if (filters.source) {
    conditions.push(`btrim(${qcol("source")}) = btrim($${idx}::text)`);
    params.push(filters.source);
    idx += 1;
  }

  if (filters.sourceWebsiteName) {
    conditions.push(
      `btrim(${qcol("sourceWebsiteName")}) = btrim($${idx}::text)`,
    );
    params.push(filters.sourceWebsiteName);
    idx += 1;
  }

  if (filters.country) {
    conditions.push(`${qcol("country")} = $${idx}`);
    params.push(filters.country);
    idx += 1;
  }

  if (filters.dateFrom) {
    conditions.push(`${qcol("createdAt")} >= $${idx}::date`);
    params.push(filters.dateFrom);
    idx += 1;
  }

  if (filters.dateTo) {
    conditions.push(`${qcol("createdAt")} < ($${idx}::date + interval '1 day')`);
    params.push(filters.dateTo);
    idx += 1;
  }

  if (filters.assignedExecId) {
    conditions.push(`${qcol("assignedSalesExecId")} = $${idx}`);
    params.push(filters.assignedExecId);
    idx += 1;
  }

  if (filters.assignedMtlId) {
    conditions.push(`${qcol("assignedMainTeamLeadId")} = $${idx}`);
    params.push(filters.assignedMtlId);
    idx += 1;
  }

  if (filters.teamId) {
    conditions.push(`${qcol("teamId")} = $${idx}`);
    params.push(filters.teamId);
    idx += 1;
  }

  if (filters.analystId) {
    conditions.push(`${qcol("createdById")} = $${idx}`);
    params.push(filters.analystId);
    idx += 1;
  }

  return {
    clause: conditions.length ? `AND ${conditions.join("\nAND ")}` : "",
    params,
    nextIndex: idx,
  };
}
