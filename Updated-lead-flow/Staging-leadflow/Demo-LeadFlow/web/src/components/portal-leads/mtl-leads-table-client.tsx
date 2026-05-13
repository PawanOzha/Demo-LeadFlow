"use client";

import { useMemo, useState, type ReactNode } from "react";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import ExecLostNotesReadonly from "@/components/exec-lost-notes-readonly";
import { AssignToExecForm } from "@/components/mtl/assign-to-exec-form";
import { LeadSourcePill } from "@/components/lead-source-display";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import { PortalLeadsExportBar } from "@/components/portal-leads-export-bar";
import { PortalLeadsListToolbar } from "@/components/portal-leads-list-toolbar";
import { SalesStage } from "@/lib/constants";
import { buildMtlLeadsExportPayloadFromPortalRows } from "@/lib/portal-all-leads-export-payloads";
import type { PortalMtlLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import type { PortalExportScope } from "@/lib/portal-export-scope";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import type { MtlLeadRow } from "@/lib/mtl-lead-row";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";
import { PersonWithMiniAvatar } from "@/components/user-mini-avatar";

export type { MtlLeadRow };

function MtlLeadsDataTable({
  leads,
  execs,
  toolbar,
}: {
  leads: MtlLeadRow[];
  execs: { id: string; name: string }[];
  toolbar: ReactNode;
}) {
  return (
    <>
      <PortalLeadsTableScrollHint />
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
        {toolbar}
        <div
          className={portalDataTableScrollClass}
          role="region"
          aria-label="Team leads table"
          tabIndex={0}
        >
          <table className="w-full min-w-[1400px] border-collapse text-[13px]">
            <thead className="border-b border-lf-border bg-lf-bg/80">
              <tr>
                <th className="min-w-[200px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Source</th>
                <th className="min-w-[140px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Name</th>
                <th className="min-w-[120px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Phone</th>
                <th className="min-w-[180px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Email</th>
                <th className="min-w-[110px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Analyst</th>
                <th className="min-w-[72px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Score</th>
                <th className="min-w-[120px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Stage</th>
                <th className="min-w-[11rem] max-w-[28rem] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Analyst notes
                </th>
                <th className="min-w-[200px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Executive notes</th>
                <th className="min-w-[110px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Rep</th>
                <th className="min-w-[140px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Deadline</th>
                <th className="min-w-[160px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Assign</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    No leads in this range.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const open =
                    lead.salesStage !== SalesStage.CLOSED_WON &&
                    lead.salesStage !== SalesStage.CLOSED_LOST;
                  return (
                    <tr
                      key={lead.id}
                      className="group align-top border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0"
                    >
                      <td className="min-w-0 max-w-[260px] px-4 py-3 align-top text-lf-text-secondary">
                        <LeadSourcePill source={lead.source} />
                      </td>
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
                      <td className="px-4 py-3 text-lf-muted">
                        <PersonWithMiniAvatar
                          id={lead.createdBy.id}
                          name={lead.createdBy.name}
                          image={lead.createdBy.image}
                        />
                      </td>
                      <td className="px-4 py-3 text-lf-muted">
                        {lead.leadScore ?? "—"}
                      </td>
                      <td className="min-w-0 px-4 py-3 text-lf-muted">
                        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-lf-elevated px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-lf-label ring-1 ring-lf-border">
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
                        {lead.assignedSalesExec ? (
                          <PersonWithMiniAvatar
                            id={lead.assignedSalesExec.id}
                            name={lead.assignedSalesExec.name}
                            image={lead.assignedSalesExec.image}
                          />
                        ) : (
                          "—"
                        )}
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
      </div>
    </>
  );
}

function MtlLeadsExportAndTable({
  toolbarPagination,
  searchSlot,
  searchQuery,
  rangeLabel,
  exportLeads,
  exportScope,
  rangeTotalCount,
  leads,
  execs,
  toolbarExport,
}: {
  toolbarPagination: ReactNode;
  searchSlot: ReactNode | null;
  searchQuery: string;
  rangeLabel: string;
  exportLeads: PortalMtlLeadExportRow[];
  exportScope: PortalExportScope;
  rangeTotalCount: number;
  leads: MtlLeadRow[];
  execs: { id: string; name: string }[];
  /** When false, omit export from this row (e.g. export is rendered in the portal top panel). */
  toolbarExport: boolean;
}) {
  const exportPayload = useMemo(
    () =>
      buildMtlLeadsExportPayloadFromPortalRows(exportLeads, {
        rangeLabel,
        searchQuery,
        rangeTotalCount,
        exportRowCount: exportLeads.length,
      }),
    [exportLeads, rangeLabel, searchQuery, rangeTotalCount],
  );

  const toolbar = (
    <PortalLeadsListToolbar
      pagination={toolbarPagination}
      search={searchSlot}
      trailing={
        toolbarExport ? (
          <PortalLeadsExportBar
            payload={exportPayload}
            compact
            exportScope={exportScope}
          />
        ) : undefined
      }
    />
  );

  return <MtlLeadsDataTable leads={leads} execs={execs} toolbar={toolbar} />;
}

function MtlLeadsTableWithEmbeddedSearch({
  leads,
  initialQ,
  execs,
  rangeLabel,
  exportLeads,
  exportScope,
  rangeTotalCount,
  toolbarPagination,
  toolbarExport,
}: {
  leads: MtlLeadRow[];
  initialQ: string | null;
  execs: { id: string; name: string }[];
  rangeLabel: string;
  exportLeads: PortalMtlLeadExportRow[];
  exportScope: PortalExportScope;
  rangeTotalCount: number;
  toolbarPagination: ReactNode;
  toolbarExport: boolean;
}) {
  const [query, setQuery] = useState(initialQ ?? "");
  useDebouncedLeadSearchUrl(query);

  return (
    <MtlLeadsExportAndTable
      toolbarPagination={toolbarPagination}
      searchSlot={
        <PortalLeadSearchLiveField variant="inline" value={query} onChange={setQuery} />
      }
      searchQuery={query}
      rangeLabel={rangeLabel}
      exportLeads={exportLeads}
      exportScope={exportScope}
      rangeTotalCount={rangeTotalCount}
      leads={leads}
      execs={execs}
      toolbarExport={toolbarExport}
    />
  );
}

export function MtlLeadsTableClient({
  leads,
  initialQ,
  execs,
  rangeLabel,
  exportLeads,
  exportScope,
  rangeTotalCount,
  hideClientSearch = false,
  toolbarExport = true,
  toolbarPagination,
}: {
  leads: MtlLeadRow[];
  initialQ: string | null;
  execs: { id: string; name: string }[];
  rangeLabel: string;
  exportLeads: PortalMtlLeadExportRow[];
  exportScope: PortalExportScope;
  rangeTotalCount: number;
  /** When true, parent owns debounced `q` (e.g. portal dashboard search). */
  hideClientSearch?: boolean;
  /**
   * When false, omit the compact export control from the table toolbar (parent renders export in the dashboard panel).
   */
  toolbarExport?: boolean;
  /** Typically `<PortalPaginationBar variant="toolbar" … />` from the server page. */
  toolbarPagination: ReactNode;
}) {
  if (hideClientSearch) {
    return (
      <MtlLeadsExportAndTable
        toolbarPagination={toolbarPagination}
        searchSlot={null}
        searchQuery={initialQ ?? ""}
        rangeLabel={rangeLabel}
        exportLeads={exportLeads}
        exportScope={exportScope}
        rangeTotalCount={rangeTotalCount}
        leads={leads}
        execs={execs}
        toolbarExport={toolbarExport}
      />
    );
  }

  return (
    <MtlLeadsTableWithEmbeddedSearch
      leads={leads}
      initialQ={initialQ}
      execs={execs}
      rangeLabel={rangeLabel}
      exportLeads={exportLeads}
      exportScope={exportScope}
      rangeTotalCount={rangeTotalCount}
      toolbarPagination={toolbarPagination}
      toolbarExport={toolbarExport}
    />
  );
}
