import { QualificationStatus, type QualificationStatusValue } from "@/lib/constants";
import { searchParamFirst } from "@/lib/analyst-date-range";
import { rpcJsonParamTextArrayUnpack } from "@/lib/db/pool";
import { buildLeadWhereClause } from "@/lib/server/leads/where-builder";

export type AtlLeadSqlFilters = {
  /** Must be one of the ATL's analysts (validated by caller). */
  createdById?: string | null;
  /** Exact match on Lead.source */
  source?: string | null;
  /** `Lead.sourceWebsiteName` — URL param `website`. */
  sourceWebsiteName?: string | null;
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

  parts.push(
    `${c("createdById")} = ANY(${rpcJsonParamTextArrayUnpack(i)})`,
  );
  i += 1;
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
      sourceWebsiteName: filters?.sourceWebsiteName ?? undefined,
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

/** ATL leads/dashboard URL filters — same rules as the team leads list page. */
export function atlListFiltersFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
  analystIds: string[],
  q: string | null,
): AtlLeadSqlFilters {
  const statusRaw = searchParamFirst(sp, "status")?.trim() ?? "";
  const statusFilter: QualificationStatusValue | null =
    statusRaw === QualificationStatus.QUALIFIED ||
    statusRaw === QualificationStatus.NOT_QUALIFIED ||
    statusRaw === QualificationStatus.IRRELEVANT
      ? statusRaw
      : null;

  const analystIdCandidate = searchParamFirst(sp, "analystId")?.trim() ?? "";
  const analystIdFilter =
    analystIdCandidate && analystIds.includes(analystIdCandidate)
      ? analystIdCandidate
      : null;

  const sourceCandidate = searchParamFirst(sp, "source")?.trim() ?? "";
  const sourceFilter =
    sourceCandidate.length > 0 && sourceCandidate.length <= 256
      ? sourceCandidate
      : null;

  const websiteCandidate = searchParamFirst(sp, "website")?.trim() ?? "";
  const websiteFilter =
    websiteCandidate.length > 0 && websiteCandidate.length <= 256
      ? websiteCandidate
      : null;

  return {
    qualificationStatus: statusFilter,
    createdById: analystIdFilter,
    source: sourceFilter,
    sourceWebsiteName: websiteFilter,
    q,
  };
}
