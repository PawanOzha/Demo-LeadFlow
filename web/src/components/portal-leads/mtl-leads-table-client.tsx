"use client";

import { useMemo, useState } from "react";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import ExecLostNotesReadonly from "@/components/exec-lost-notes-readonly";
import { AssignToExecForm } from "@/components/mtl/assign-to-exec-form";
import { LeadSourcePill } from "@/components/lead-source-display";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import { PortalLeadsExportBar } from "@/components/portal-leads-export-bar";
import { SalesStage } from "@/lib/constants";
import { filterLeadsByNameOrPhone } from "@/lib/lead-client-search";
import { buildMtlLeadsExportPayloadFromPortalRows } from "@/lib/portal-all-leads-export-payloads";
import type { PortalMtlLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import type { MtlLeadRow } from "@/lib/mtl-lead-row";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";

export type { MtlLeadRow };

export function MtlLeadsTableClient({
  leads,
  initialQ,
  execs,
  rangeLabel,
  exportLeads,
  rangeTotalCount,
  exportRowCount,
}: {
  leads: MtlLeadRow[];
  initialQ: string | null;
  execs: { id: string; name: string }[];
  rangeLabel: string;
  exportLeads: PortalMtlLeadExportRow[];
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
      buildMtlLeadsExportPayloadFromPortalRows(filteredExport, {
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
        className={`rounded-2xl border border-lf-border bg-lf-surface shadow-sm ring-1 ring-black/[0.04] ${portalDataTableScrollClass}`}
        role="region"
        aria-label="Team leads table"
        tabIndex={0}
      >
        <table className="w-max min-w-[1400px] border-collapse text-left text-sm">
          <thead className="border-b border-lf-border bg-lf-bg/80 text-xs uppercase tracking-wide text-lf-subtle">
            <tr>
              <th className="min-w-[140px] px-4 py-3 font-semibold">Name</th>
              <th className="min-w-[120px] px-4 py-3 font-semibold">Phone</th>
              <th className="min-w-[180px] px-4 py-3 font-semibold">Email</th>
              <th className="min-w-[200px] px-4 py-3 font-semibold">Source</th>
              <th className="min-w-[110px] px-4 py-3 font-semibold">Analyst</th>
              <th className="min-w-[72px] px-4 py-3 font-semibold">Score</th>
              <th className="min-w-[120px] px-4 py-3 font-semibold">Stage</th>
              <th className="min-w-[11rem] max-w-[28rem] px-4 py-3 font-semibold">
                Analyst notes
              </th>
              <th className="min-w-[200px] px-4 py-3 font-semibold">Executive notes</th>
              <th className="min-w-[110px] px-4 py-3 font-semibold">Rep</th>
              <th className="min-w-[140px] px-4 py-3 font-semibold">Deadline</th>
              <th className="min-w-[160px] px-4 py-3 font-semibold">Assign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lf-divide">
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-10 text-center text-lf-subtle"
                >
                  No leads in this range.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-10 text-center text-lf-subtle"
                >
                  {hasQuery
                    ? "No leads match this name or phone in the current filters."
                    : "No leads in this range."}
                </td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const open =
                  lead.salesStage !== SalesStage.CLOSED_WON &&
                  lead.salesStage !== SalesStage.CLOSED_LOST;
                return (
                  <tr
                    key={lead.id}
                    className="group align-top transition-colors hover:bg-lf-bg/20"
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
                    <td className="min-w-0 max-w-[260px] px-4 py-3 align-top text-lf-text-secondary">
                      <LeadSourcePill source={lead.source} />
                    </td>
                    <td className="px-4 py-3 text-lf-muted">
                      {lead.createdBy.name}
                    </td>
                    <td className="px-4 py-3 text-lf-muted">
                      {lead.leadScore ?? "—"}
                    </td>
                    <td className="min-w-0 px-4 py-3 text-lf-muted">
                      <span className="inline-block whitespace-nowrap rounded-full bg-lf-bg px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-lf-text-secondary">
                        {lead.salesStage.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="max-w-[28rem] min-w-0 px-4 py-3 align-top">
                      <AnalystNotesReadonly notes={lead.notes} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <ExecLostNotesReadonly notes={lead.lostNotes} />
                    </td>
                    <td className="px-4 py-3 text-lf-muted">
                      {lead.assignedSalesExec?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-lf-subtle">
                      {lead.execDeadlineAt
                        ? new Date(lead.execDeadlineAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {open && execs.length > 0 ? (
                        <AssignToExecForm
                          leadId={lead.id}
                          execs={execs}
                          currentExecId={lead.assignedSalesExecId}
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
