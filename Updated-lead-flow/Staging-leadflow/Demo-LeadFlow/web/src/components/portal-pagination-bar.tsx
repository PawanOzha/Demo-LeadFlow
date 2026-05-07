import Link from "next/link";

type QVal = string | null | undefined;

function buildHref(
  pathname: string,
  query: Record<string, QVal>,
  patch?: Record<string, QVal>,
) {
  const p = new URLSearchParams();
  const merged = { ...query, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v != null && String(v).trim() !== "") p.set(k, String(v));
  }
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function buildPageItems(page: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const bounded = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | "..."> = [];
  for (let i = 0; i < bounded.length; i += 1) {
    const curr = bounded[i]!;
    const prev = bounded[i - 1];
    if (prev != null && curr - prev > 1) out.push("...");
    out.push(curr);
  }
  return out;
}

export function PortalPaginationBar({
  pathname,
  query,
  page,
  perPage,
  totalCount,
  countNoun = "leads",
}: {
  pathname: string;
  query: Record<string, QVal>;
  page: number;
  perPage: 25 | 50 | 200;
  totalCount: number;
  /** Plural label after total count, e.g. "events" for transfer log. */
  countNoun?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = buildPageItems(safePage, totalPages);
  const start = totalCount === 0 ? 0 : (safePage - 1) * perPage + 1;
  const end = Math.min(safePage * perPage, totalCount);

  const prevHref =
    safePage > 1
      ? buildHref(pathname, query, { page: String(safePage - 1) })
      : null;
  const nextHref =
    safePage < totalPages
      ? buildHref(pathname, query, { page: String(safePage + 1) })
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-lf-border bg-lf-surface px-4 py-3 text-sm">
      <p className="text-lf-subtle">
        Showing{" "}
        <span className="font-semibold text-lf-text">
          {start.toLocaleString()}-{end.toLocaleString()}
        </span>{" "}
        of <span className="font-semibold text-lf-text">{totalCount.toLocaleString()}</span>{" "}
        {countNoun}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-lf-subtle">Per page:</span>
        {[25, 50, 200].map((n) => (
          <Link
            key={n}
            href={buildHref(pathname, query, {
              perPage: String(n),
              page: "1",
            })}
            className={`inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2 ${
              perPage === n
                ? "border-lf-border bg-lf-sidebar-active text-lf-text"
                : "border-lf-border bg-lf-surface text-lf-text-secondary hover:bg-lf-row-hover"
            }`}
          >
            {n}
          </Link>
        ))}
        {prevHref ? (
          <Link
            href={prevHref}
            className="inline-flex h-9 items-center rounded-md border border-lf-border bg-lf-surface px-4 text-sm font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2"
          >
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md border border-lf-border px-4 text-sm text-lf-subtle opacity-50">
            Previous
          </span>
        )}
        <div className="flex items-center gap-1">
          {pageItems.map((item, idx) =>
            item === "..." ? (
              <span key={`gap-${idx}`} className="px-1 text-xs text-lf-subtle">
                ...
              </span>
            ) : (
              <Link
                key={item}
                href={buildHref(pathname, query, { page: String(item) })}
                aria-current={item === safePage ? "page" : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors ${
                  item === safePage
                    ? "border-lf-border bg-lf-sidebar-active text-lf-text"
                    : "border-lf-border bg-lf-surface text-lf-text-secondary hover:bg-lf-row-hover"
                }`}
              >
                {item}
              </Link>
            ),
          )}
        </div>
        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex h-9 items-center rounded-md border border-lf-border bg-lf-surface px-4 text-sm font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2"
          >
            Next
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md border border-lf-border px-4 text-sm text-lf-subtle opacity-50">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
