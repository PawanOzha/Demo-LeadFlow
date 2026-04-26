import { leadCreatedAtRange } from "@/lib/analyst-date-range";
import { QualificationStatus, type QualificationStatusValue } from "@/lib/constants";

export type AtlLeadSqlFilters = {
  /** Must be one of the ATL's analysts (validated by caller). */
  createdById?: string | null;
  /** Exact match on Lead.source */
  source?: string | null;
  qualificationStatus?: QualificationStatusValue | null;
};

/** SQL WHERE for leads created by any of `analystIds` (optional `createdAt` range and filters). */
export function atlLeadSql(
  analystIds: string[],
  from?: string | null,
  to?: string | null,
  filters?: AtlLeadSqlFilters | null,
): { clause: string; params: unknown[] } {
  const range = leadCreatedAtRange(from, to);
  if (analystIds.length === 0) {
    return { clause: `FALSE`, params: [] };
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let i = 0;
  const next = () => `$${++i}`;

  parts.push(`"createdById" = ANY(${next()}::text[])`);
  params.push(analystIds);

  if (range) {
    parts.push(`"createdAt" >= ${next()}::timestamp`);
    parts.push(`"createdAt" <= ${next()}::timestamp`);
    params.push(range.gte, range.lte);
  }

  const qs = filters?.qualificationStatus?.trim();
  if (
    qs &&
    (Object.values(QualificationStatus) as string[]).includes(qs)
  ) {
    parts.push(`"qualificationStatus" = ${next()}`);
    params.push(qs);
  }

  const analyst = filters?.createdById?.trim();
  if (analyst) {
    parts.push(`"createdById" = ${next()}`);
    params.push(analyst);
  }

  const src = filters?.source?.trim();
  if (src) {
    parts.push(`"source" = ${next()}`);
    params.push(src);
  }

  return { clause: parts.join(" AND "), params };
}
