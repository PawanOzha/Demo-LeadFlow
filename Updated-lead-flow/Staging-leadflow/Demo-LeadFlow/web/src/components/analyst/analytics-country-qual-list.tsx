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
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-lf-muted">
        <span className="sr-only">Legend</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-lf-border/50 bg-lf-surface/70 px-2.5 py-1 shadow-sm ring-1 ring-black/[0.03] dark:bg-lf-elevated/40 dark:ring-white/[0.04]">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-b from-lf-success to-lf-success/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
            aria-hidden
          />
          Qualified
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-lf-border/50 bg-lf-surface/70 px-2.5 py-1 shadow-sm ring-1 ring-black/[0.03] dark:bg-lf-elevated/40 dark:ring-white/[0.04]">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-b from-lf-danger to-lf-danger/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
            aria-hidden
          />
          Not qualified
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-lf-border/50 bg-lf-surface/70 px-2.5 py-1 shadow-sm ring-1 ring-black/[0.03] dark:bg-lf-elevated/40 dark:ring-white/[0.04]">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-b from-lf-subtle to-lf-subtle/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            aria-hidden
          />
          Irrelevant
        </span>
      </div>

      <ul className="max-h-[28rem] space-y-0 overflow-y-auto rounded-xl border border-lf-border/45 bg-lf-bg/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:bg-lf-elevated/10">
        {rows.length === 0 ? (
          <li className="px-3 py-10 text-center text-sm text-lf-subtle">
            No data
          </li>
        ) : (
          visible.map((row) => {
            const { iso, label, q, nq, ir, total } = row;
            const pct = (n: number) =>
              total > 0 ? Math.max(0, (n / total) * 100) : 0;
            const segClass =
              "relative min-h-full min-w-0 transition-[filter] duration-150 first:rounded-l-full last:rounded-r-full";

            return (
              <li
                key={iso}
                className="border-b border-lf-border/35 px-3.5 py-3.5 last:border-b-0 hover:bg-lf-surface/60 dark:hover:bg-lf-elevated/20"
              >
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-lf-text">
                    {label}
                  </span>
                  <span className="shrink-0 rounded-lg bg-lf-elevated/50 px-2 py-0.5 text-[11px] font-bold tabular-nums tracking-tight text-lf-text-secondary ring-1 ring-lf-border/40 dark:bg-lf-elevated/35">
                    {total.toLocaleString()}
                  </span>
                </div>
                <div
                  className="relative h-3 w-full overflow-hidden rounded-full bg-lf-border/[0.14] ring-1 ring-lf-border/25 shadow-[inset_0_1px_2px_rgba(255,255,255,0.75)] dark:bg-white/[0.07] dark:ring-white/[0.07] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.04)]"
                  role="img"
                  aria-label={`${label}: ${q} qualified, ${nq} not qualified, ${ir} irrelevant of ${total}`}
                >
                  <div className="flex h-full w-full">
                    {q > 0 ? (
                      <div
                        className={`${segClass} bg-gradient-to-b from-lf-success via-lf-success to-lf-success/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]`}
                        style={{
                          width: `${pct(q)}%`,
                          minWidth: pct(q) > 0 && pct(q) < 1 ? "3px" : undefined,
                        }}
                        title={`Qualified: ${q}`}
                      />
                    ) : null}
                    {nq > 0 ? (
                      <div
                        className={`${segClass} bg-gradient-to-b from-lf-danger via-lf-danger to-lf-danger/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]`}
                        style={{
                          width: `${pct(nq)}%`,
                          minWidth: pct(nq) > 0 && pct(nq) < 1 ? "3px" : undefined,
                        }}
                        title={`Not qualified: ${nq}`}
                      />
                    ) : null}
                    {ir > 0 ? (
                      <div
                        className={`${segClass} bg-gradient-to-b from-lf-subtle via-lf-subtle to-lf-subtle/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}
                        style={{
                          width: `${pct(ir)}%`,
                          minWidth: pct(ir) > 0 && pct(ir) < 1 ? "3px" : undefined,
                        }}
                        title={`Irrelevant: ${ir}`}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-lf-success/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-lf-success ring-1 ring-lf-success/20">
                    Q {q.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-lf-danger/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-lf-danger ring-1 ring-lf-danger/20">
                    NQ {nq.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-lf-muted/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-lf-muted ring-1 ring-lf-border/40">
                    IR {ir.toLocaleString()}
                  </span>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {hasMore ? (
        <div className="mt-4 flex justify-center border-t border-lf-border/60 pt-4">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-lf-link transition-colors hover:bg-lf-bg/60 hover:text-lf-link hover:underline"
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
