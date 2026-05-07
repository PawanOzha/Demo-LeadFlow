"use client";

import { useState } from "react";
import type { CountryQualRow } from "@/lib/leads-by-country-qual";

const TOP_N = 10;

export type { CountryQualRow };

export function AnalyticsCountryQualList({ rows }: { rows: CountryQualRow[] }) {
  const [expanded, setExpanded] = useState(false);

  const hasMore = rows.length > TOP_N;
  const visible = expanded ? rows : rows.slice(0, TOP_N);

  return (
    <>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-lf-border pb-3 text-[10px] text-lf-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-lf-success" />
          Qualified
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-lf-danger" />
          Not qualified
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-lf-subtle" />
          Irrelevant
        </li>
      </ul>

      <ul className="space-y-5">
        {rows.length === 0 ? (
          <li className="text-sm text-lf-subtle">No data</li>
        ) : (
          visible.map((row) => {
            const { iso, label, q, nq, ir, total } = row;
            const pct = (n: number) =>
              total > 0 ? Math.max(0, (n / total) * 100) : 0;
            return (
              <li key={iso}>
                <div className="mb-2 flex justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-medium text-lf-text-secondary">
                    {label}
                  </span>
                  <span className="shrink-0 tabular-nums text-lf-text">
                    {total}
                  </span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-lf-bg">
                  {q > 0 ? (
                    <div
                      className="min-w-0 bg-lf-success"
                      style={{ width: `${pct(q)}%` }}
                      title={`Qualified: ${q}`}
                    />
                  ) : null}
                  {nq > 0 ? (
                    <div
                      className="min-w-0 bg-lf-danger"
                      style={{ width: `${pct(nq)}%` }}
                      title={`Not qualified: ${nq}`}
                    />
                  ) : null}
                  {ir > 0 ? (
                    <div
                      className="min-w-0 bg-lf-subtle"
                      style={{ width: `${pct(ir)}%` }}
                      title={`Irrelevant: ${ir}`}
                    />
                  ) : null}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] tabular-nums text-lf-muted">
                  <span className="text-lf-success">Q {q}</span>
                  <span className="text-lf-danger">NQ {nq}</span>
                  <span className="text-lf-muted">IR {ir}</span>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {hasMore ? (
        <div className="mt-4 flex justify-center border-t border-lf-border pt-4">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-sm font-medium text-lf-link hover:text-lf-link hover:underline"
          >
            {expanded
              ? "Show less (top 10)"
              : `Show more (${rows.length - TOP_N} more)`}
          </button>
        </div>
      ) : null}
    </>
  );
}
