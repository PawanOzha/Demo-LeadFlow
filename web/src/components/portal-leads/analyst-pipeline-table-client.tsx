"use client";

import { useMemo, useState } from "react";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import ExecLostNotesReadonly from "@/components/exec-lost-notes-readonly";
import { LeadSourcePill } from "@/components/lead-source-display";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import {
  formatAnalystDate,
  pipelinePillForLead,
  scoreBarColor,
} from "@/lib/analyst-ui";
import { SalesStage } from "@/lib/constants";
import { filterLeadsByNameOrPhone } from "@/lib/lead-client-search";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";

export type PipelineLeadRow = {
  id: string;
  leadName: string;
  phone: string | null;
  source: string;
  notes: string | null;
  lostNotes: string | null;
  qualificationStatus: string;
  salesStage: string;
  leadScore: number | null;
  createdAt: string;
};

export function AnalystPipelineTableClient({
  qualified,
  initialQ,
  from,
  to,
}: {
  qualified: PipelineLeadRow[];
  initialQ: string | null;
  from: string | null;
  to: string | null;
}) {
  const [query, setQuery] = useState(initialQ ?? "");
  useDebouncedLeadSearchUrl(query);

  const filtered = useMemo(
    () => filterLeadsByNameOrPhone(qualified, query),
    [qualified, query],
  );

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <div className="rounded-2xl border border-lf-border bg-gradient-to-b from-lf-elevated to-lf-bg px-4 py-4 shadow-sm ring-1 ring-black/[0.03] sm:px-5 sm:py-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-lf-subtle">
          Find a client
        </p>
        <PortalLeadSearchLiveField value={query} onChange={setQuery} />
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
        <div className="border-b border-lf-border bg-lf-bg/40 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-lf-text">
            All qualified leads — pipeline view
          </h2>
        </div>
        <PortalLeadsTableScrollHint />
        <div
          className={`px-1 pb-1 ${portalDataTableScrollClass}`}
          role="region"
          aria-label="Pipeline table"
          tabIndex={0}
        >
          <table className="w-full min-w-[880px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-lf-border bg-lf-bg/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Lead</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Source</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Notes</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Score</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Pipeline</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Qualified on</th>
              </tr>
            </thead>
            <tbody>
              {qualified.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    {from || to
                      ? "No qualified leads in this date range."
                      : "No qualified leads yet."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    {hasQuery
                      ? "No qualified leads match this name or phone in the current filters."
                      : from || to
                        ? "No qualified leads in this date range."
                        : "No qualified leads yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const pill = pipelinePillForLead(
                    l.qualificationStatus,
                    l.salesStage,
                  );
                  const s = l.leadScore;
                  return (
                    <tr
                      key={l.id}
                      className="border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0"
                    >
                      <td className="px-4 py-3 text-[13px] font-semibold text-lf-text-secondary">
                        {l.leadName || "—"}
                      </td>
                      <td className="min-w-0 max-w-[260px] px-4 py-3 align-top text-[13px] text-lf-text-secondary">
                        <LeadSourcePill source={l.source} />
                      </td>
                      <td className="max-w-[28rem] min-w-0 px-4 py-3 align-top text-[13px] text-lf-text-secondary">
                        {l.salesStage === SalesStage.CLOSED_LOST ? (
                          l.lostNotes?.trim() ? (
                            <ExecLostNotesReadonly notes={l.lostNotes} />
                          ) : (
                            <span className="text-lf-subtle">
                              No loss reason recorded
                            </span>
                          )
                        ) : (
                          <AnalystNotesReadonly notes={l.notes} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-lf-text-secondary">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-lf-bg">
                            <div
                              className={`h-full rounded-full ${scoreBarColor(s)}`}
                              style={{
                                width: `${s != null ? Math.min(100, s) : 0}%`,
                              }}
                            />
                          </div>
                          <span className="tabular-nums text-lf-text">
                            {s ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-lf-text-secondary">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-lf-text-secondary">
                        {formatAnalystDate(new Date(l.createdAt))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
