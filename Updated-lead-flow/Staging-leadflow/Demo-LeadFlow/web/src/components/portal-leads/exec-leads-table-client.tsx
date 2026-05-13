"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PortalLeadsExportBar } from "@/components/portal-leads-export-bar";
import { PortalLeadsListToolbar } from "@/components/portal-leads-list-toolbar";
import { LeadSourceDisplay } from "@/components/lead-source-display";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import { ExecLostNotesEditor } from "@/components/exec/exec-lost-notes-editor";
import { UpdateOutcomeForm } from "@/components/exec/update-outcome-form";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import { SalesStage } from "@/lib/constants";
import { salesExecutiveFacingSalesLabel } from "@/lib/sales-stage-labels";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import { buildExecLeadsExportPayload } from "@/lib/portal-all-leads-export-payloads";
import type { PortalExecLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import type { PortalExportScope } from "@/lib/portal-export-scope";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";
import { formatDealMoney } from "@/lib/deal-money";
import { PersonWithMiniAvatar } from "@/components/user-mini-avatar";

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
  createdBy: { id: string; name: string; image: string | null };
  estimatedDealValue: number | null;
  closedRevenue: number | null;
  dealCurrency: string;
};

function ExecLeadsDataTable({
  leads,
  toolbar,
}: {
  leads: ExecLeadRow[];
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
          aria-label="My leads table"
          tabIndex={0}
        >
          <table className="w-full min-w-[52rem] border-collapse text-[13px] sm:min-w-[60rem] md:min-w-[72rem] lg:min-w-[80rem]">
            <thead className="border-b border-lf-border bg-lf-bg/80">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Source
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Name
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Phone
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Email
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Analyst
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Score
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Deadline
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Stage
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Est. value
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Closed revenue
                </th>
                <th className="max-w-[28rem] min-w-0 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Analyst notes
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Loss notes
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted sm:px-4 sm:py-3">
                  Outcome
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    No leads match your filters for this period. Widen the date range
                    or clear search and filters.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const active = lead.salesStage === SalesStage.WITH_EXECUTIVE;
                  const isLost = lead.salesStage === SalesStage.CLOSED_LOST;
                  return (
                    <tr
                      key={lead.id}
                      className="align-top border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0"
                    >
                      <td className="min-w-0 max-w-[240px] px-3 py-2.5 align-top text-lf-text-secondary sm:px-4 sm:py-3">
                        <LeadSourceDisplay source={lead.source} />
                      </td>
                      <td className="px-3 py-2.5 font-medium text-lf-text sm:px-4 sm:py-3">
                        {lead.leadName || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-lf-muted sm:px-4 sm:py-3">
                        {lead.phone || "—"}
                      </td>
                      <td className="max-w-[220px] min-w-0 break-all px-3 py-2.5 text-lf-muted sm:px-4 sm:py-3 sm:break-normal">
                        <span
                          className="block sm:truncate"
                          title={lead.leadEmail ?? undefined}
                        >
                          {lead.leadEmail || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-lf-muted sm:px-4 sm:py-3">
                        <PersonWithMiniAvatar
                          id={lead.createdBy.id}
                          name={lead.createdBy.name}
                          image={lead.createdBy.image}
                        />
                      </td>
                      <td className="px-3 py-2.5 font-medium text-lf-accent sm:px-4 sm:py-3">
                        {lead.leadScore ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-lf-subtle sm:px-4 sm:py-3">
                        {lead.execDeadlineAt
                          ? new Date(lead.execDeadlineAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="max-w-[10rem] px-3 py-2.5 text-lf-muted sm:max-w-none sm:px-4 sm:py-3">
                        <span
                          className="line-clamp-2 sm:line-clamp-none"
                          title={salesExecutiveFacingSalesLabel(lead.salesStage)}
                        >
                          {salesExecutiveFacingSalesLabel(lead.salesStage)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-lf-muted sm:px-4 sm:py-3">
                        {formatDealMoney(
                          lead.estimatedDealValue,
                          lead.dealCurrency,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-lf-muted sm:px-4 sm:py-3">
                        {formatDealMoney(
                          lead.closedRevenue,
                          lead.dealCurrency,
                        )}
                      </td>
                      <td className="max-w-[28rem] min-w-0 px-3 py-2.5 align-top sm:px-4 sm:py-3">
                        <AnalystNotesReadonly notes={lead.notes} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-lf-text-secondary sm:px-4 sm:py-3">
                        {isLost ? (
                          <ExecLostNotesEditor
                            leadId={lead.id}
                            initialNotes={lead.lostNotes}
                          />
                        ) : (
                          <span className="text-lf-subtle">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
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
      </div>
    </>
  );
}

function ExecLeadsExportAndTable({
  toolbarPagination,
  searchSlot,
  searchQuery,
  rangeLabel,
  exportLeads,
  exportScope,
  rangeTotalCount,
  leads,
}: {
  toolbarPagination: ReactNode;
  searchSlot: ReactNode | null;
  searchQuery: string;
  rangeLabel: string;
  exportLeads: PortalExecLeadExportRow[];
  exportScope: PortalExportScope;
  rangeTotalCount: number;
  leads: ExecLeadRow[];
}) {
  const exportPayload = useMemo(
    () =>
      buildExecLeadsExportPayload(exportLeads, {
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
        <PortalLeadsExportBar
          payload={exportPayload}
          compact
          exportScope={exportScope}
        />
      }
    />
  );

  return <ExecLeadsDataTable leads={leads} toolbar={toolbar} />;
}

function ExecLeadsTableWithEmbeddedSearch({
  leads,
  initialQ,
  rangeLabel,
  exportLeads,
  exportScope,
  rangeTotalCount,
  toolbarPagination,
}: {
  leads: ExecLeadRow[];
  initialQ: string | null;
  rangeLabel: string;
  exportLeads: PortalExecLeadExportRow[];
  exportScope: PortalExportScope;
  rangeTotalCount: number;
  toolbarPagination: ReactNode;
}) {
  const [query, setQuery] = useState(initialQ ?? "");
  useDebouncedLeadSearchUrl(query);

  return (
    <ExecLeadsExportAndTable
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
    />
  );
}

export function ExecLeadsTableClient({
  leads,
  initialQ,
  rangeLabel,
  exportLeads,
  exportScope,
  rangeTotalCount,
  hideClientSearch = false,
  toolbarPagination,
}: {
  leads: ExecLeadRow[];
  initialQ: string | null;
  rangeLabel: string;
  exportLeads: PortalExecLeadExportRow[];
  exportScope: PortalExportScope;
  rangeTotalCount: number;
  hideClientSearch?: boolean;
  toolbarPagination: ReactNode;
}) {
  if (hideClientSearch) {
    return (
      <ExecLeadsExportAndTable
        toolbarPagination={toolbarPagination}
        searchSlot={null}
        searchQuery={initialQ ?? ""}
        rangeLabel={rangeLabel}
        exportLeads={exportLeads}
        exportScope={exportScope}
        rangeTotalCount={rangeTotalCount}
        leads={leads}
      />
    );
  }

  return (
    <ExecLeadsTableWithEmbeddedSearch
      leads={leads}
      initialQ={initialQ}
      rangeLabel={rangeLabel}
      exportLeads={exportLeads}
      exportScope={exportScope}
      rangeTotalCount={rangeTotalCount}
      toolbarPagination={toolbarPagination}
    />
  );
}
