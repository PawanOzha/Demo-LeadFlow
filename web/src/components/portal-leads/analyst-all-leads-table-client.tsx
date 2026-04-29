"use client";

import { useMemo, useState } from "react";
import { PortalLeadsExportBar } from "@/components/portal-leads-export-bar";
import AnalystQualificationSelect from "@/components/analyst/analyst-qualification-select";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import ExecLostNotesReadonly from "@/components/exec-lost-notes-readonly";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import { filterLeadsByNameOrPhone } from "@/lib/lead-client-search";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import { LeadSourcePill } from "@/components/lead-source-display";
import { formatAnalystDate } from "@/lib/analyst-ui";
import { analystFacingSalesLabel } from "@/lib/sales-stage-labels";
import { buildAnalystLeadsExportPayload } from "@/lib/portal-all-leads-export-payloads";
import type { PortalAnalystLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";

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
};

export function AnalystAllLeadsTableClient({
  leads,
  initialQ,
  from,
  to,
  rangeLabel,
  exportLeads,
  rangeTotalCount,
  exportRowCount,
}: {
  leads: AnalystAllLeadsRow[];
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
      buildAnalystLeadsExportPayload(filteredExport, {
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
        className={`w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${portalDataTableScrollClass}`}
        role="region"
        aria-label="Your leads table"
        tabIndex={0}
      >
          <table className="w-full min-w-[1000px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Phone</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Source</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Qualification</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Score</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sales status</th>
                <th className="max-w-[28rem] min-w-[11rem] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Your notes
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Executive notes</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Added</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-16 text-center text-[13px] text-gray-400"
                  >
                    {from || to
                      ? "No leads in this date range."
                      : "No leads yet."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-16 text-center text-[13px] text-gray-400"
                  >
                    {hasQuery
                      ? "No leads match this name or phone in the current filters."
                      : from || to
                        ? "No leads in this date range."
                        : "No leads yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-gray-100 text-[13px] text-gray-700 transition-colors hover:bg-gray-50 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[13px] font-semibold text-gray-700">
                      {l.leadName || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-gray-700">
                      {l.phone || "—"}
                    </td>
                    <td className="max-w-[220px] min-w-0 px-4 py-3 text-[13px] text-gray-700">
                      <span
                        className="block truncate"
                        title={l.leadEmail ?? undefined}
                      >
                        {l.leadEmail || "—"}
                      </span>
                    </td>
                    <td className="min-w-0 max-w-[260px] px-4 py-3 align-top text-[13px] text-gray-700">
                      <LeadSourcePill source={l.source} />
                    </td>
                    <td className="px-4 py-3 align-middle text-[13px] text-gray-700">
                      <AnalystQualificationSelect
                        leadId={l.id}
                        value={l.qualificationStatus}
                      />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700 tabular-nums">
                      {l.leadScore ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
                      {analystFacingSalesLabel(l.salesStage)}
                    </td>
                    <td className="max-w-[28rem] min-w-0 px-4 py-3 align-top text-[13px] text-gray-700">
                      <AnalystNotesReadonly notes={l.notes} />
                    </td>
                    <td className="px-4 py-3 align-top text-[13px] text-gray-700">
                      <ExecLostNotesReadonly notes={l.lostNotes} />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
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
