import { normalizeClientSearchQuery } from "@/lib/lead-client-search";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = s.trim().match(ISO_DATE);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * When both `from` and `to` are set, normalize to canonical YYYY-MM-DD strings
 * matching {@link leadCreatedAtRange} (including when the user reversed the order).
 * If only one side is set, returns them unchanged (open-ended range semantics).
 */
export function canonicalizePortalDatePair(
  from: string | null,
  to: string | null,
): { from: string | null; to: string | null } {
  if (!from || !to) return { from, to };
  const range = leadCreatedAtRange(from, to);
  if (!range) return { from, to };
  return {
    from: toYmd(range.gte),
    to: toYmd(range.lte),
  };
}

/** Next.js `searchParams` entries are often `string | string[] | undefined`. */
export function normalizeYmdOrNull(
  v?: string | string[] | null,
): string | null {
  if (v == null) return null;
  const scalar = Array.isArray(v) ? v[0] : v;
  if (scalar == null) return null;
  const t = scalar.trim();
  if (!t) return null;
  const p = parseYmd(t);
  if (!p) return null;
  const d = new Date(p.y, p.m - 1, p.d);
  // Reject impossible dates like 2026-02-31 that JS normalizes.
  if (
    d.getFullYear() !== p.y ||
    d.getMonth() !== p.m - 1 ||
    d.getDate() !== p.d
  ) {
    return null;
  }
  return toYmd(d);
}

function endOfToday(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
}

/** Inclusive filtering on `createdAt` (local dates). */
export function leadCreatedAtRange(
  fromStr?: string | null,
  toStr?: string | null,
): { gte: Date; lte: Date } | undefined {
  const from = fromStr?.trim();
  const to = toStr?.trim();
  if (!from && !to) return undefined;

  if (from && !to) {
    const p = parseYmd(from);
    if (!p) return undefined;
    const gte = new Date(p.y, p.m - 1, p.d, 0, 0, 0, 0);
    return { gte, lte: endOfToday() };
  }

  if (!from && to) {
    const p = parseYmd(to);
    if (!p) return undefined;
    const lte = new Date(p.y, p.m - 1, p.d, 23, 59, 59, 999);
    return { gte: new Date(0), lte };
  }

  const sf = parseYmd(from!);
  const st = parseYmd(to!);
  if (!sf || !st) return undefined;
  const gte = new Date(sf.y, sf.m - 1, sf.d, 0, 0, 0, 0);
  const lte = new Date(st.y, st.m - 1, st.d, 23, 59, 59, 999);
  if (gte > lte) return { gte: lte, lte: gte };
  return { gte, lte };
}

/** SQL WHERE fragment + params for leads owned by `createdById` (optional date on `createdAt`). */
export function leadWhereSql(
  createdById: string,
  fromStr?: string | null,
  toStr?: string | null,
): { clause: string; params: unknown[] } {
  const range = leadCreatedAtRange(fromStr, toStr);
  if (!range) {
    return { clause: `"createdById" = $1`, params: [createdById] };
  }
  return {
    clause: `"createdById" = $1 AND "createdAt" >= $2::timestamp AND "createdAt" <= $3::timestamp`,
    params: [createdById, range.gte, range.lte],
  };
}

export function analystRangeSummaryLabel(
  fromStr?: string | null,
  toStr?: string | null,
): string {
  const range = leadCreatedAtRange(fromStr, toStr);
  if (!range) return "All time";
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(range.gte)} – ${fmt(range.lte)}`;
}

export function hrefWithDateRange(
  path: string,
  fromStr?: string | null,
  toStr?: string | null,
  qStr?: string | null,
): string {
  const from = fromStr?.trim();
  const to = toStr?.trim();
  const q = normalizeClientSearchQuery(qStr ?? null);
  if (!from && !to && !q) return path;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Shared by portal date bars: Apply → `?from=` / `?to=` (each optional) + `page=1`
 * plus preserved params. Omitting `to` means “from date through today”; omitting
 * `from` means “up to end of to date” — matches {@link leadCreatedAtRange}.
 */
export function buildPortalDateRangeApplyHref(
  pathname: string,
  fromYmd: string | null,
  toYmd: string | null,
  preservedEntries: [string, string][],
): string {
  const p = new URLSearchParams();
  const seen = new Set<string>();
  for (const [k, v] of preservedEntries) {
    if (k === "from" || k === "to" || k === "page") continue;
    const val = String(v);
    const sig = `${k}\u0000${val}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    p.append(k, val);
  }
  if (fromYmd) p.set("from", fromYmd);
  if (toYmd) p.set("to", toYmd);
  p.set("page", "1");
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : `${pathname}?page=1`;
}

/** Clear date range but keep other query params (e.g. search `q`). */
export function buildPortalDateRangeClearHref(
  pathname: string,
  preservedEntries: [string, string][],
): string {
  const p = new URLSearchParams();
  const seen = new Set<string>();
  for (const [k, v] of preservedEntries) {
    if (k === "from" || k === "to" || k === "page") continue;
    const val = String(v);
    const sig = `${k}\u0000${val}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    p.append(k, val);
  }
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Query pairs to keep when applying/clearing dashboard date filters (excludes
 * `from`, `to`, `page`). Built on the server so the date bar never needs
 * `useSearchParams` (avoids Suspense / client-router issues in App Router).
 */
export async function preservedSearchParamEntriesForDateBar(
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>,
): Promise<[string, string][]> {
  const resolved = await Promise.resolve(searchParams);
  const sp = resolved ?? {};
  const skip = new Set(["from", "to", "page"]);
  const out: [string, string][] = [];
  for (const [key, raw] of Object.entries(sp)) {
    if (skip.has(key)) continue;
    if (raw === undefined) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const v of values) {
      out.push([key, v]);
    }
  }
  return out;
}

/** First value for a query key (Next.js may pass `string | string[]`). */
export function searchParamFirst(
  sp: Record<string, string | string[] | undefined> | null | undefined,
  key: string,
): string | undefined {
  if (sp == null) return undefined;
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** Next.js app router `searchParams` (Promise + `string | string[]` values in15+). */
export async function analystRangeParams(
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>,
): Promise<{ from: string | null; to: string | null; q: string | null }> {
  const resolved = await Promise.resolve(searchParams);
  const sp = resolved ?? {};
  const fromRaw = normalizeYmdOrNull(searchParamFirst(sp, "from"));
  const toRaw = normalizeYmdOrNull(searchParamFirst(sp, "to"));
  const { from, to } = canonicalizePortalDatePair(fromRaw, toRaw);
  return {
    from,
    to,
    q: normalizeClientSearchQuery(searchParamFirst(sp, "q")),
  };
}
