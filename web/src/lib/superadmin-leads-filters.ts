import {
  canonicalizePortalDatePair,
  leadCreatedAtRange,
  normalizeYmdOrNull,
} from "@/lib/analyst-date-range";
import { escapePostgresLikePattern } from "@/lib/lead-server-search";
import { QualificationStatus } from "@/lib/constants";

export type SuperadminLeadsStatus =
  | (typeof QualificationStatus)[keyof typeof QualificationStatus]
  | "ALL";

export type SuperadminLeadsParsed = {
  from: string | null;
  to: string | null;
  q: string | null;
  status: SuperadminLeadsStatus;
  analystId: string | null;
  teamId: string | null;
  execId: string | null;
  page: number;
  perPage: 25 | 50 | 100;
};

/** SQL fragment (no leading WHERE) + params for filtering "Lead" rows. */
export type SuperadminLeadsWhereSql = {
  /** Combined with AND; use `TRUE` when empty. */
  clause: string;
  params: unknown[];
};

function first(
  v: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function trimOrNull(v: string | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function positiveIntOr(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

/** Parse Next.js `searchParams` for superadmin leads filters. */
export function parseSuperadminLeadsSearchParams(
  sp: Record<string, string | string[] | undefined>,
): SuperadminLeadsParsed {
  const statusRaw = first(sp.status);
  const status: SuperadminLeadsStatus =
    statusRaw === QualificationStatus.QUALIFIED ||
    statusRaw === QualificationStatus.NOT_QUALIFIED ||
    statusRaw === QualificationStatus.IRRELEVANT
      ? statusRaw
      : "ALL";

  const perPageRaw = Number.parseInt(first(sp.perPage) ?? "", 10);
  const perPage: 25 | 50 | 100 =
    perPageRaw === 50 || perPageRaw === 100 ? perPageRaw : 25;

  const fromRaw = normalizeYmdOrNull(first(sp.from) ?? null);
  const toRaw = normalizeYmdOrNull(first(sp.to) ?? null);
  const { from, to } = canonicalizePortalDatePair(fromRaw, toRaw);

  return {
    from,
    to,
    q: trimOrNull(first(sp.q))?.slice(0, 200) ?? null,
    status,
    analystId: trimOrNull(first(sp.analystId)),
    teamId: trimOrNull(first(sp.teamId)),
    execId: trimOrNull(first(sp.execId)),
    page: positiveIntOr(first(sp.page), 1),
    perPage,
  };
}

/** Build SQL WHERE fragment for `Lead` (alias optional — use bare column names). */
export function buildSuperadminLeadsWhereSql(
  p: SuperadminLeadsParsed,
): SuperadminLeadsWhereSql {
  const parts: string[] = [];
  const params: unknown[] = [];
  let n = 1;

  const range = leadCreatedAtRange(p.from, p.to);

  if (range) {
    parts.push(
      `"createdAt" >= $${n}::timestamp AND "createdAt" <= $${n + 1}::timestamp`,
    );
    params.push(range.gte, range.lte);
    n += 2;
  }

  if (p.q) {
    const pat = `%${escapePostgresLikePattern(p.q)}%`;
    parts.push(
      `(COALESCE("leadName", '') ILIKE $${n} ESCAPE '\\' OR COALESCE(phone, '') ILIKE $${n} ESCAPE '\\' OR COALESCE("leadEmail", '') ILIKE $${n} ESCAPE '\\')`,
    );
    params.push(pat);
    n += 1;
  }

  if (p.status !== "ALL") {
    parts.push(`"qualificationStatus" = $${n}`);
    params.push(p.status);
    n += 1;
  }

  if (p.analystId) {
    parts.push(`"createdById" = $${n}`);
    params.push(p.analystId);
    n += 1;
  }

  if (p.teamId) {
    parts.push(`"teamId" = $${n}`);
    params.push(p.teamId);
    n += 1;
  }
  if (p.execId) {
    parts.push(`"assignedSalesExecId" = $${n}`);
    params.push(p.execId);
    n += 1;
  }

  return {
    clause: parts.length > 0 ? parts.join(" AND ") : "TRUE",
    params,
  };
}

function fmtShort(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function superadminLeadsFilterSummary(
  p: SuperadminLeadsParsed,
  opts: {
    analystLabel?: string | null;
    teamName?: string | null;
    execLabel?: string | null;
  },
): string {
  const range = leadCreatedAtRange(p.from, p.to);
  const rangeText = range
    ? `${fmtShort(range.gte)} – ${fmtShort(range.lte)}`
    : "All time";

  const statusText =
    p.status === "ALL" ? "Status: All" : `Status: ${p.status.replace(/_/g, " ")}`;
  const searchText = p.q ? `Search: "${p.q}"` : "Search: All";
  const analystText = p.analystId
    ? `Lead analyst: ${opts.analystLabel?.trim() || p.analystId}`
    : "Lead analyst: All";
  const teamText = p.teamId
    ? `Team: ${opts.teamName?.trim() || p.teamId}`
    : "Team: All";
  const execText = p.execId
    ? `Sales executive: ${opts.execLabel?.trim() || p.execId}`
    : "Sales executive: All";

  return `${rangeText} · ${searchText} · ${statusText} · ${analystText} · ${teamText} · ${execText}`;
}
