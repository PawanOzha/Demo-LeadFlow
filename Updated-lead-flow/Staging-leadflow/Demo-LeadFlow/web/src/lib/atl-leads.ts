import { QualificationStatus, type QualificationStatusValue } from "@/lib/constants";
import { buildLeadWhereClause } from "@/lib/server/leads/where-builder";

export type AtlLeadSqlFilters = {
  /** Must be one of the ATL's analysts (validated by caller). */
  createdById?: string | null;
  /** Exact match on Lead.source */
  source?: string | null;
  qualificationStatus?: QualificationStatusValue | null;
  /** Name/phone/email contains (case-insensitive). */
  q?: string | null;
};

/** SQL WHERE for leads created by any of `analystIds` (optional `createdAt` range and filters). */
export function atlLeadSql(
  analystIds: string[],
  from?: string | null,
  to?: string | null,
  filters?: AtlLeadSqlFilters | null,
  leadAlias?: string,
): { clause: string; params: unknown[] } {
  const c = (col: string) => (leadAlias ? `${leadAlias}."${col}"` : `"${col}"`);
  if (analystIds.length === 0) {
    return { clause: `FALSE`, params: [] };
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  const next = () => `$${i++}`;

  parts.push(`${c("createdById")} = ANY(${next()}::text[])`);
  params.push(analystIds);
  const qs = filters?.qualificationStatus?.trim();
  const status =
    qs && (Object.values(QualificationStatus) as string[]).includes(qs)
      ? qs
      : undefined;
  const where = buildLeadWhereClause(
    {
      q: filters?.q ?? undefined,
      source: filters?.source ?? undefined,
      analystId: filters?.createdById ?? undefined,
      dateFrom: from ?? undefined,
      dateTo: to ?? undefined,
      status,
    },
    i,
    leadAlias ?? "l",
  );

  return {
    clause: `${parts.join(" AND ")} ${where.clause}`,
    params: [...params, ...where.params],
  };
}
