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
  perPage: 25 | 50 | 100;
  totalCount: number;
  /** Plural label after total count, e.g. "events" for transfer log. */
  countNoun?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lf-border bg-lf-surface/80 px-4 py-3 text-sm">
      <p className="text-lf-subtle">
        Showing{" "}
        <span className="font-semibold text-lf-text">
          {start}-{end}
        </span>{" "}
        of <span className="font-semibold text-lf-text">{totalCount}</span>{" "}
        {countNoun}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-lf-subtle">Per page:</span>
        {[25, 50, 100].map((n) => (
          <Link
            key={n}
            href={buildHref(pathname, query, {
              perPage: String(n),
              page: "1",
            })}
            className={`h-9 rounded-lg border px-4 text-[13px] font-medium ${
              perPage === n
                ? "border-lf-border bg-lf-surface text-lf-text-secondary"
                : "border-lf-border bg-lf-surface text-lf-text-secondary hover:bg-lf-row-hover"
            }`}
          >
            {n}
          </Link>
        ))}
        {prevHref ? (
          <Link
            href={prevHref}
            className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-lf-border px-3 py-1.5 text-xs text-lf-subtle opacity-50">
            Previous
          </span>
        )}
        <span className="text-xs text-lf-subtle">
          Page {safePage} of {totalPages}
        </span>
        {nextHref ? (
          <Link
            href={nextHref}
            className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-lf-border px-3 py-1.5 text-xs text-lf-subtle opacity-50">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
