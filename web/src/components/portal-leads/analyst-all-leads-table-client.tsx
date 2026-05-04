"use client";

import { useMemo, useState } from "react";
import { PortalLeadsExportBar } from "@/components/portal-leads-export-bar";
import AnalystQualificationSelect from "@/components/analyst/analyst-qualification-select";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import ExecLostNotesReadonly from "@/components/exec-lost-notes-readonly";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import { usePortalLeadTablePageScroll } from "@/lib/use-portal-lead-table-page-scroll";
import { LeadSourcePill } from "@/components/lead-source-display";
import { formatAnalystDate } from "@/lib/analyst-ui";
import { analystFacingSalesLabel } from "@/lib/sales-stage-labels";
import { buildAnalystLeadsExportPayload } from "@/lib/portal-all-leads-export-payloads";
import type { PortalAnalystLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";
import { formatDealMoney } from "@/lib/deal-money";

export type AnalystAllLeadsRow = {
  id: string;
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  source: string;
  notes: string | null;
  lostNotes: string | null;
  qualificationStatus: string;
  leadScore: number | null;
  salesStage: string;
  createdAt: string;
  estimatedDealValue: number | null;
  closedRevenue: number | null;
  dealCurrency: string;
};

export function AnalystAllLeadsTableClient({
  leads,
  page,
  initialQ,
  from,
  to,
  rangeLabel,
  exportLeads,
  rangeTotalCount,
  exportRowCount,
}: {
  leads: AnalystAllLeadsRow[];
  page: number;
  initialQ: string | null;
  from: string | null;
  to: string | null;
  rangeLabel: string;
  exportLeads: PortalAnalystLeadExportRow[];
  rangeTotalCount: number;
  exportRowCount: number;
}) {
  const [query, setQuery] = useState(initialQ ?? "");
  useDebouncedLeadSearchUrl(query);
  const tableScrollRef = usePortalLeadTablePageScroll(page);

  const exportPayload = useMemo(
    () =>
      buildAnalystLeadsExportPayload(exportLeads, {
        rangeLabel,
        searchQuery: initialQ ?? "",
        rangeTotalCount,
        exportRowCount,
      }),
    [exportLeads, rangeLabel, initialQ, rangeTotalCount, exportRowCount],
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

      <PortalLeadsExportBar payload={exportPayload} />

      <PortalLeadsTableScrollHint />
      <div
        ref={tableScrollRef}
        className={`w-full overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm ${portalDataTableScrollClass}`}
        role="region"
        aria-label="Your leads table"
        tabIndex={0}
      >
          <table className="w-full min-w-[1180px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-lf-border bg-lf-bg/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Phone</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Source</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Qualification</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Score</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Sales status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Est. value</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Closed revenue</th>
                <th className="max-w-[28rem] min-w-[11rem] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Your notes
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Executive notes</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Added</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    {hasQuery
                      ? "No leads match this name or phone in the current filters."
                      : from || to
                        ? "No leads in this date range."
                        : "No leads yet."}
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[13px] font-semibold text-lf-text-secondary">
                      {l.leadName || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-lf-text-secondary">
                      {l.phone || "—"}
                    </td>
                    <td className="max-w-[220px] min-w-0 px-4 py-3 text-[13px] text-lf-text-secondary">
                      <span
                        className="block truncate"
                        title={l.leadEmail ?? undefined}
                      >
                        {l.leadEmail || "—"}
                      </span>
                    </td>
                    <td className="min-w-0 max-w-[260px] px-4 py-3 align-top text-[13px] text-lf-text-secondary">
                      <LeadSourcePill source={l.source} />
                    </td>
                    <td className="px-4 py-3 align-middle text-[13px] text-lf-text-secondary">
                      <AnalystQualificationSelect
                        leadId={l.id}
                        value={l.qualificationStatus}
                      />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-lf-text-secondary tabular-nums">
                      {l.leadScore ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-lf-text-secondary">
                      {analystFacingSalesLabel(l.salesStage)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] tabular-nums text-lf-text-secondary">
                      {formatDealMoney(l.estimatedDealValue, l.dealCurrency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] tabular-nums text-lf-text-secondary">
                      {formatDealMoney(l.closedRevenue, l.dealCurrency)}
                    </td>
                    <td className="max-w-[28rem] min-w-0 px-4 py-3 align-top text-[13px] text-lf-text-secondary">
                      <AnalystNotesReadonly notes={l.notes} />
                    </td>
                    <td className="px-4 py-3 align-top text-[13px] text-lf-text-secondary">
                      <ExecLostNotesReadonly notes={l.lostNotes} />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-lf-text-secondary">
                      {formatAnalystDate(new Date(l.createdAt))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>
    </>
  );
}
