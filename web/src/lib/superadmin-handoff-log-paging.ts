/** Shared paging parser for superadmin handoff / transfer log tables (URL search params). */

function first(sp: string | string[] | undefined): string | undefined {
  if (Array.isArray(sp)) return sp[0];
  return sp;
}

export function parseHandoffLogPaging(
  sp: Record<string, string | string[] | undefined>,
): {
  page: number;
  perPage: 25 | 50 | 100;
} {
  const pageRaw = Number.parseInt(first(sp.page) ?? "", 10);
  const perPageRaw = Number.parseInt(first(sp.perPage) ?? "", 10);
  const perPage: 25 | 50 | 100 =
    perPageRaw === 50 || perPageRaw === 100 ? perPageRaw : 25;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  return { page, perPage };
}
