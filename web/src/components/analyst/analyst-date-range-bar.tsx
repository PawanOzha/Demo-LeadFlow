"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildPortalDateRangeApplyHref,
  buildPortalDateRangeClearHref,
  normalizeYmdOrNull,
} from "@/lib/analyst-date-range";

export type AnalystDateRangeBarProps = {
  /** Current route pathname, e.g. `/analyst-team-lead/reports` */
  pathname: string;
  defaultFrom: string;
  defaultTo: string;
  /** Params to preserve (e.g. `q`, `perPage`) — excludes from/to/page. */
  preservedEntries: [string, string][];
  /**
   * Human-readable range applied to this page’s query (from the server).
   * Confirms the URL was read and matches dashboard/list data.
   */
  rangeSummary?: string;
};

/**
 * Date range filter for portal dashboards and lead lists.
 *
 * Apply/Clear use app-router navigation with {@link buildPortalDateRangeApplyHref}
 * to avoid full document reloads while preserving query behavior:
 * `?from=` / `?to=` (either or both) / `page=1` plus preserved params.
 *
 * At least one valid date is required. Single-date ranges align with
 * {@link leadCreatedAtRange} (from-only → through today; to-only → from epoch).
 */
export default function AnalystDateRangeBar({
  pathname,
  defaultFrom,
  defaultTo,
  preservedEntries,
  rangeSummary,
}: AnalystDateRangeBarProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [applyError, setApplyError] = useState<string | null>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const hasActiveRange = Boolean(
    (defaultFrom ?? "").trim() || (defaultTo ?? "").trim(),
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let fromSafe = normalizeYmdOrNull(fromInputRef.current?.value ?? "");
    let toSafe = normalizeYmdOrNull(toInputRef.current?.value ?? "");

    if (!fromSafe && !toSafe) {
      setApplyError("Enter a “From” date, a “To” date, or both.");
      return;
    }

    if (fromSafe && toSafe && fromSafe > toSafe) {
      const tmp = fromSafe;
      fromSafe = toSafe;
      toSafe = tmp;
    }

    setApplyError(null);
    startTransition(() => {
      router.replace(
        buildPortalDateRangeApplyHref(pathname, fromSafe, toSafe, preservedEntries),
      );
    });
  }

  function onClear() {
    setApplyError(null);
    startTransition(() => {
      router.replace(buildPortalDateRangeClearHref(pathname, preservedEntries));
    });
  }

  return (
    <div className="rounded-2xl border border-lf-border bg-gradient-to-b from-lf-elevated to-lf-bg px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-end gap-3">
        <form
          key={`${defaultFrom}|${defaultTo}`}
          onSubmit={onSubmit}
          className="flex flex-wrap items-end gap-3"
          noValidate
        >
          {preservedEntries.map(([k, v], i) => (
            <input
              key={`${i}-${k}`}
              type="hidden"
              name={k}
              value={String(v)}
              aria-hidden
            />
          ))}
          <input type="hidden" name="page" value="1" aria-hidden />
          <label className="text-xs font-medium text-lf-muted">
            From
            <input
              ref={fromInputRef}
              type="date"
              name="from"
              defaultValue={defaultFrom}
              className="mt-1.5 block min-h-10 w-full min-w-[10rem] rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text outline-none ring-lf-brand/35 focus:border-lf-brand/50 focus:ring-2 focus:ring-lf-brand/25 [color-scheme:light]"
              aria-invalid={applyError ? true : undefined}
              aria-describedby={applyError ? "date-range-apply-error" : undefined}
            />
          </label>
          <label className="text-xs font-medium text-lf-muted">
            To
            <input
              ref={toInputRef}
              type="date"
              name="to"
              defaultValue={defaultTo}
              className="mt-1.5 block min-h-10 w-full min-w-[10rem] rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text outline-none ring-lf-brand/35 focus:border-lf-brand/50 focus:ring-2 focus:ring-lf-brand/25 [color-scheme:light]"
              aria-invalid={applyError ? true : undefined}
              aria-describedby={applyError ? "date-range-apply-error" : undefined}
            />
          </label>
          <button
            type="submit"
            disabled={isNavigating}
            className="min-h-10 rounded-lg bg-lf-accent px-4 text-xs font-semibold text-lf-on-accent shadow-sm transition hover:bg-lf-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-on-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lf-accent"
          >
            {isNavigating ? "Applying..." : "Apply"}
          </button>
        </form>
        {hasActiveRange ? (
          <button
            type="button"
            onClick={onClear}
            disabled={isNavigating}
            className="min-h-10 rounded-lg border border-lf-border px-4 text-xs font-medium text-lf-text-secondary hover:bg-lf-bg/50"
          >
            Clear
          </button>
        ) : null}
      </div>
      {rangeSummary ? (
        <p className="mt-3 rounded-lg border border-lf-border bg-lf-surface px-3 py-2 text-sm text-lf-text-secondary">
          <span className="font-semibold text-lf-text">Active data range:</span>{" "}
          {rangeSummary}
          <span className="block pt-1 text-xs text-lf-muted">
            Filters use each lead’s <span className="font-medium">creation date</span>{" "}
            (<code className="rounded bg-lf-bg px-1 text-[11px]">createdAt</code>), not
            last update or close date.
          </span>
        </p>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-lf-subtle">
        From only: that date through today. To only: from the beginning through that
        date. Both: inclusive range (order is adjusted if From is after To).
      </p>
      {applyError ? (
        <p
          id="date-range-apply-error"
          role="alert"
          className="mt-2 text-sm text-lf-danger"
        >
          {applyError}
        </p>
      ) : null}
    </div>
  );
}
