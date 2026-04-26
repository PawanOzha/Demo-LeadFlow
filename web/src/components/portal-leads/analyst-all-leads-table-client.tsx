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
        className={`rounded-2xl border border-lf-border bg-lf-surface shadow-sm ring-1 ring-black/[0.04] ${portalDataTableScrollClass}`}
        role="region"
        aria-label="Your leads table"
        tabIndex={0}
      >
          <table className="w-max min-w-[1000px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-lf-border bg-lf-bg/80 text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Qualification</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Sales status</th>
                <th className="max-w-[28rem] min-w-[11rem] px-4 py-3 font-medium">
                  Your notes
                </th>
                <th className="px-4 py-3 font-medium">Executive notes</th>
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lf-divide">
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-lf-subtle"
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
                    className="px-4 py-12 text-center text-lf-subtle"
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
                    className="text-lf-muted transition-colors hover:bg-lf-bg/20"
                  >
                    <td className="px-4 py-3 font-semibold text-lf-text">
                      {l.leadName || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {l.phone || "—"}
                    </td>
                    <td className="max-w-[220px] min-w-0 px-4 py-3">
                      <span
                        className="block truncate"
                        title={l.leadEmail ?? undefined}
                      >
                        {l.leadEmail || "—"}
                      </span>
                    </td>
                    <td className="min-w-0 max-w-[260px] px-4 py-3 align-top">
                      <LeadSourcePill source={l.source} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <AnalystQualificationSelect
                        leadId={l.id}
                        value={l.qualificationStatus}
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {l.leadScore ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-lf-text-secondary">
                      {analystFacingSalesLabel(l.salesStage)}
                    </td>
                    <td className="max-w-[28rem] min-w-0 px-4 py-3 align-top">
                      <AnalystNotesReadonly notes={l.notes} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <ExecLostNotesReadonly notes={l.lostNotes} />
                    </td>
                    <td className="px-4 py-3 text-xs">
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
