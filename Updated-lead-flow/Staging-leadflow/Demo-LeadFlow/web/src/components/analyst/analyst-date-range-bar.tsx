"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildPortalDateRangeApplyHref,
  buildPortalDateRangeClearHref,
  normalizeYmdOrNull,
} from "@/lib/analyst-date-range";

export type AnalystDateRangeBarProps = {
  /** Current route pathname, e.g. `/analyst-team-lead/qualified-pipeline` */
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
  compact?: boolean;
  /** No outer card; use inside {@link PortalDashboardTopPanel}. */
  embedded?: boolean;
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
  compact = false,
  embedded = false,
}: AnalystDateRangeBarProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [applyError, setApplyError] = useState<string | null>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isNavigating;

  const isEmbedded = embedded;
  const effectiveCompact = compact || isEmbedded;

  const hasActiveRange = Boolean(
    (defaultFrom ?? "").trim() || (defaultTo ?? "").trim(),
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isBusy) return;
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
    if (isBusy) return;
    setApplyError(null);
    startTransition(() => {
      router.replace(buildPortalDateRangeClearHref(pathname, preservedEntries));
    });
  }

  return (
    <div
      className={
        isEmbedded
          ? "min-w-0"
          : effectiveCompact
            ? "rounded-xl border border-lf-border bg-lf-surface/80 px-2.5 py-2 shadow-sm"
            : "rounded-2xl border border-lf-border bg-gradient-to-b from-lf-elevated to-lf-bg px-4 py-4 shadow-sm sm:px-5 sm:py-5"
      }
    >
      <div
        className={`flex flex-wrap items-end ${effectiveCompact ? "gap-2" : "gap-3"}`}
      >
        <form
          onSubmit={onSubmit}
          className={`flex flex-wrap items-end ${effectiveCompact ? "gap-2" : "gap-3"}`}
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
          <label
            className={
              effectiveCompact
                ? "flex min-w-[8.5rem] flex-col gap-1"
                : "text-xs font-medium text-lf-muted"
            }
          >
            <span className={effectiveCompact ? "text-[11px] font-medium text-lf-muted" : undefined}>
              From
            </span>
            <input
              ref={fromInputRef}
              type="date"
              name="from"
              defaultValue={defaultFrom}
              className={`block w-full rounded-lg border border-lf-border bg-lf-bg px-3 text-sm text-lf-text outline-none ring-lf-brand/35 focus:border-lf-brand/50 focus:ring-2 focus:ring-lf-brand/25 [color-scheme:light] ${effectiveCompact ? "min-h-9 min-w-[8.5rem] py-1.5" : "mt-1.5 min-h-10 min-w-[10rem] py-2"}`}
              aria-invalid={applyError ? true : undefined}
              aria-describedby={applyError ? "date-range-apply-error" : undefined}
            />
          </label>
          <label
            className={
              effectiveCompact
                ? "flex min-w-[8.5rem] flex-col gap-1"
                : "text-xs font-medium text-lf-muted"
            }
          >
            <span className={effectiveCompact ? "text-[11px] font-medium text-lf-muted" : undefined}>
              To
            </span>
            <input
              ref={toInputRef}
              type="date"
              name="to"
              defaultValue={defaultTo}
              className={`block w-full rounded-lg border border-lf-border bg-lf-bg px-3 text-sm text-lf-text outline-none ring-lf-brand/35 focus:border-lf-brand/50 focus:ring-2 focus:ring-lf-brand/25 [color-scheme:light] ${effectiveCompact ? "min-h-9 min-w-[8.5rem] py-1.5" : "mt-1.5 min-h-10 min-w-[10rem] py-2"}`}
              aria-invalid={applyError ? true : undefined}
              aria-describedby={applyError ? "date-range-apply-error" : undefined}
            />
          </label>
          <button
            type="submit"
            disabled={isBusy}
            className={`rounded-lg bg-lf-accent px-4 text-xs font-semibold text-lf-on-accent shadow-sm transition hover:bg-lf-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-on-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lf-accent ${effectiveCompact ? "min-h-9" : "min-h-10"}`}
          >
            {isBusy ? "Applying..." : "Apply"}
          </button>
        </form>
        {hasActiveRange ? (
          <button
            type="button"
            onClick={onClear}
            disabled={isBusy}
            className={`rounded-lg border border-lf-border px-4 text-xs font-medium text-lf-text-secondary hover:bg-lf-bg/50 ${effectiveCompact ? "min-h-9" : "min-h-10"}`}
          >
            Clear
          </button>
        ) : null}
      </div>
      {rangeSummary ? (
        <span className="sr-only">
          Date filter scope: {rangeSummary}. Applies to lead creation date.
        </span>
      ) : null}
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
