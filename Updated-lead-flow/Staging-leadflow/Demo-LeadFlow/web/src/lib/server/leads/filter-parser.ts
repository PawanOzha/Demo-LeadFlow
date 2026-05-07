import { QualificationStatus, SalesStage } from "@/lib/constants";
import { normalizeClientSearchQuery } from "@/lib/lead-client-search";

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export interface LeadFilters {
  q?: string;
  status?: string;
  salesStage?: string;
  source?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
  assignedExecId?: string;
  assignedMtlId?: string;
  teamId?: string;
  analystId?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

function getParam(source: SearchParamsLike, key: string): string | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined;
  }
  const v = source[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseIsoDate(v?: string): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  return t;
}

function parseText(v?: string, maxLen = 200): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, maxLen);
}

function parseStatus(v?: string): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  return (Object.values(QualificationStatus) as string[]).includes(t)
    ? t
    : undefined;
}

function parseStage(v?: string): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  return (Object.values(SalesStage) as string[]).includes(t) ? t : undefined;
}

export function parseLeadFilters(searchParams: SearchParamsLike): LeadFilters {
  const q = normalizeClientSearchQuery(
    getParam(searchParams, "q") ?? getParam(searchParams, "search") ?? null,
  );
  return {
    q: q ?? undefined,
    status: parseStatus(getParam(searchParams, "status")),
    salesStage: parseStage(getParam(searchParams, "salesStage")),
    source: parseText(getParam(searchParams, "source"), 256),
    country: parseText(getParam(searchParams, "country"), 128),
    dateFrom: parseIsoDate(getParam(searchParams, "from")),
    dateTo: parseIsoDate(getParam(searchParams, "to")),
    assignedExecId: parseText(getParam(searchParams, "assignedExecId"), 64),
    assignedMtlId: parseText(getParam(searchParams, "assignedMtlId"), 64),
    teamId: parseText(getParam(searchParams, "teamId"), 64),
    analystId: parseText(getParam(searchParams, "analystId"), 64),
  };
}

export function parsePagination(
  searchParams: SearchParamsLike,
  defaultLimit = 100,
): PaginationParams {
  const pageRaw = Number.parseInt(getParam(searchParams, "page") ?? "", 10);
  const limitRaw = Number.parseInt(
    getParam(searchParams, "limit") ??
      getParam(searchParams, "perPage") ??
      "",
    10,
  );
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const fallback = Math.min(500, Math.max(10, defaultLimit));
  const limit = Number.isFinite(limitRaw)
    ? Math.min(500, Math.max(10, limitRaw))
    : fallback;
  return { page, limit };
}
