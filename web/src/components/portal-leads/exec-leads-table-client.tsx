"use client";

import { useMemo, useState } from "react";
import { PortalLeadsExportBar } from "@/components/portal-leads-export-bar";
import { LeadSourceDisplay } from "@/components/lead-source-display";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import { ExecLostNotesEditor } from "@/components/exec/exec-lost-notes-editor";
import { UpdateOutcomeForm } from "@/components/exec/update-outcome-form";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import { SalesStage } from "@/lib/constants";
import { filterLeadsByNameOrPhone } from "@/lib/lead-client-search";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import { buildExecLeadsExportPayload } from "@/lib/portal-all-leads-export-payloads";
import type { PortalExecLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";
import { formatDealMoney } from "@/lib/deal-money";

export type ExecLeadRow = {
  id: string;
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  source: string;
  notes: string | null;
  lostNotes: string | null;
  leadScore: number | null;
  salesStage: string;
  execDeadlineAt: string | null;
  createdBy: { name: string };
  estimatedDealValue: number | null;
  closedRevenue: number | null;
  dealCurrency: string;
};

export function ExecLeadsTableClient({
  leads,
  initialQ,
  rangeLabel,
  exportLeads,
  rangeTotalCount,
  exportRowCount,
}: {
  leads: ExecLeadRow[];
  initialQ: string | null;
  rangeLabel: string;
  exportLeads: PortalExecLeadExportRow[];
  rangeTotalCount: number;
  exportRowCount: number;
}) {
  const [query, setQuery] = useState(initialQ ?? "");
  useDebouncedLeadSearchUrl(query);

  const filtered = useMemo(
    () => filterLeadsByNameOrPhone(leads, query),
    [leads, query],
  );

  const filteredExport = useMemo(
    () => filterLeadsByNameOrPhone(exportLeads, query),
    [exportLeads, query],
  );

  const exportPayload = useMemo(
    () =>
      buildExecLeadsExportPayload(filteredExport, {
        rangeLabel,
        searchQuery: query,
        rangeTotalCount,
        exportRowCount,
      }),
    [filteredExport, rangeLabel, query, rangeTotalCount, exportRowCount],
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
        className={`w-full overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm ${portalDataTableScrollClass}`}
        role="region"
        aria-label="My leads table"
        tabIndex={0}
      >
        <table className="w-full min-w-[1280px] border-collapse text-[13px]">
          <thead className="border-b border-lf-border bg-lf-bg/80">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Name</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Phone</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Email</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Source</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Analyst</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Score</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Deadline</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Stage</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Est. value</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Closed revenue</th>
              <th className="max-w-[28rem] min-w-0 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                Analyst notes
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Lost-deal notes</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Update</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="px-4 py-16 text-center text-[13px] text-lf-muted"
                >
                  No leads in this range.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="px-4 py-16 text-center text-[13px] text-lf-muted"
                >
                  {hasQuery
                    ? "No leads match this name or phone in the current filters."
                    : "No leads in this range."}
                </td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const active = lead.salesStage === SalesStage.WITH_EXECUTIVE;
                const isLost = lead.salesStage === SalesStage.CLOSED_LOST;
                return (
                  <tr
                    key={lead.id}
                    className="align-top border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-lf-text">
                      {lead.leadName || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-lf-muted">
                      {lead.phone || "—"}
                    </td>
                    <td className="max-w-[220px] min-w-0 px-4 py-3 text-lf-muted">
                      <span
                        className="block truncate"
                        title={lead.leadEmail ?? undefined}
                      >
                        {lead.leadEmail || "—"}
                      </span>
                    </td>
                    <td className="min-w-0 max-w-[240px] px-4 py-3 align-top text-lf-text-secondary">
                      <LeadSourceDisplay source={lead.source} />
                    </td>
                    <td className="px-4 py-3 text-lf-muted">
                      {lead.createdBy.name}
                    </td>
                    <td className="px-4 py-3 font-medium text-lf-accent">
                      {lead.leadScore ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-lf-subtle">
                      {lead.execDeadlineAt
                        ? new Date(lead.execDeadlineAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-lf-muted">
                      {lead.salesStage.replaceAll("_", " ")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-lf-muted">
                      {formatDealMoney(
                        lead.estimatedDealValue,
                        lead.dealCurrency,
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-lf-muted">
                      {formatDealMoney(
                        lead.closedRevenue,
                        lead.dealCurrency,
                      )}
                    </td>
                    <td className="max-w-[28rem] min-w-0 px-4 py-3 align-top">
                      <AnalystNotesReadonly notes={lead.notes} />
                    </td>
                    <td className="px-4 py-3 text-xs text-lf-text-secondary">
                      {isLost ? (
                        <ExecLostNotesEditor
                          leadId={lead.id}
                          initialNotes={lead.lostNotes}
                        />
                      ) : (
                        <span className="text-lf-subtle">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <UpdateOutcomeForm
                          leadId={lead.id}
                          dealCurrency={lead.dealCurrency}
                          estimatedDealValue={lead.estimatedDealValue}
                        />
                      ) : (
                        <span className="text-xs text-lf-subtle">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
