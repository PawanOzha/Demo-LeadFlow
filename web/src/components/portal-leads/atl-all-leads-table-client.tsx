"use client";

import { useMemo, useState } from "react";
import { PortalLeadsExportBar } from "@/components/portal-leads-export-bar";
import { AssignToMtlForm } from "@/components/atl/assign-to-mtl-form";
import { AssignDirectToExecForm } from "@/components/atl/assign-direct-to-exec-form";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import ExecLostNotesReadonly from "@/components/exec-lost-notes-readonly";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import { QualificationStatus, SalesStage } from "@/lib/constants";
import { filterLeadsByNameOrPhone } from "@/lib/lead-client-search";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import { LeadSourcePill } from "@/components/lead-source-display";
import { formatAnalystDate } from "@/lib/analyst-ui";
import { analystFacingSalesLabel } from "@/lib/sales-stage-labels";
import { buildAtlLeadsExportPayload } from "@/lib/portal-all-leads-export-payloads";
import type { PortalAtlLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";

export type AtlLeadRow = {
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
  teamId: string | null;
  assignedMainTeamLeadId: string | null;
  createdBy: { name: string };
  team: { name: string } | null;
  assignedMainTeamLead: { name: string } | null;
  assignedSalesExec: { name: string } | null;
  routedToMainTeamAt: string | null;
  assignedToExecutiveAt: string | null;
  directAssignedToExecutiveByAtlAt: string | null;
};

export type MtlOption = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
};
export type ExecOption = {
  id: string;
  name: string;
  email: string;
  teamId: string;
};

export function AtlAllLeadsTableClient({
  leads,
  initialQ,
  from,
  to,
  analystIdsEmpty,
  mtlOptions,
  execOptions,
  rangeLabel,
  exportLeads,
  rangeTotalCount,
  exportRowCount,
  hasServerFilters = false,
}: {
  leads: AtlLeadRow[];
  initialQ: string | null;
  from: string | null;
  to: string | null;
  analystIdsEmpty: boolean;
  mtlOptions: MtlOption[];
  execOptions: ExecOption[];
  rangeLabel: string;
  exportLeads: PortalAtlLeadExportRow[];
  rangeTotalCount: number;
  exportRowCount: number;
  /** True when status / analyst / source filters are applied (server-side). */
  hasServerFilters?: boolean;
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
      buildAtlLeadsExportPayload(filteredExport, {
        rangeLabel,
        searchQuery: query,
        rangeTotalCount,
        exportRowCount,
      }),
    [filteredExport, rangeLabel, query, rangeTotalCount, exportRowCount],
  );

  const hasQuery = query.trim().length > 0;

  const fmtDateTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const fmtGap = (fromIso: string | null, toIso: string | null) => {
    if (!fromIso || !toIso) return "—";
    const from = new Date(fromIso).getTime();
    const to = new Date(toIso).getTime();
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return "—";
    const mins = Math.floor((to - from) / 60000);
    const days = Math.floor(mins / (60 * 24));
    const hours = Math.floor((mins % (60 * 24)) / 60);
    const minutes = mins % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

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
        aria-label="Team leads table"
        tabIndex={0}
      >
        <table className="w-full min-w-[1320px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-lf-border bg-lf-bg/80">
                <th className="min-w-[120px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Name
                </th>
                <th className="min-w-[100px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Analyst
                </th>
                <th className="min-w-[104px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Phone
                </th>
                <th className="min-w-[152px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Email
                </th>
                <th className="min-w-[160px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Source
                </th>
                <th className="min-w-[11rem] max-w-[28rem] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Analyst notes
                </th>
                <th className="min-w-0 whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Qualification
                </th>
                <th className="min-w-[64px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Score
                </th>
                <th className="min-w-[112px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Sales status
                </th>
                <th className="min-w-[168px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Executive notes
                </th>
                <th className="min-w-[104px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Added
                </th>
                <th className="min-w-[152px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Route TL
                </th>
                <th className="min-w-[168px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Route SE
                </th>
                <th className="min-w-[220px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Pass timeline / gap
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    {from || to
                      ? "No leads in this date range."
                      : hasServerFilters
                        ? "No leads match the selected filters (status, lead analyst, or source)."
                        : analystIdsEmpty
                          ? "Add lead analysts under Members."
                          : "No leads yet from your team."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    {hasQuery
                      ? "No leads match this name or phone with the current filters."
                      : from || to
                        ? "No leads in this date range."
                        : hasServerFilters
                          ? "No leads match the selected filters (status, lead analyst, or source)."
                          : analystIdsEmpty
                            ? "Add lead analysts under Members."
                            : "No leads yet from your team."}
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const canAssign =
                    l.qualificationStatus === QualificationStatus.QUALIFIED &&
                    l.salesStage === SalesStage.PRE_SALES &&
                    mtlOptions.length > 0;
                  const canDirectAssign = canAssign && execOptions.length > 0;
                  const hasMainRoute =
                    Boolean(l.teamId || l.assignedMainTeamLeadId);
                  const teamLabel = l.team?.name ?? null;
                  const tlName = l.assignedMainTeamLead?.name ?? null;
                  const routeTlDisplay =
                    hasMainRoute && (teamLabel || tlName) ? (
                      <div className="max-w-[220px] space-y-0.5 text-xs text-lf-text-secondary">
                        {teamLabel ? (
                          <p>
                            <span className="text-lf-subtle">Team </span>
                            <span className="font-medium text-lf-text">
                              {teamLabel}
                            </span>
                          </p>
                        ) : null}
                        {tlName ? (
                          <p>
                            <span className="text-lf-subtle">TL </span>
                            <span className="font-medium text-lf-text">
                              {tlName}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    ) : null;
                  return (
                    <tr
                      key={l.id}
                      className="group align-top border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0"
                    >
                      <td className="min-w-[140px] max-w-[min(16rem,40vw)] px-4 py-3 align-top font-semibold text-lf-text break-words [overflow-wrap:anywhere]">
                        {l.leadName || "—"}
                      </td>
                      <td className="min-w-0 px-4 py-3 text-lf-text-secondary">
                        {l.createdBy.name}
                      </td>
                      <td className="min-w-0 whitespace-nowrap px-4 py-3 text-lf-text-secondary">
                        {l.phone || "—"}
                      </td>
                      <td className="min-w-0 max-w-[220px] px-4 py-3 text-lf-text-secondary">
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
                      <td className="min-w-0 max-w-[28rem] px-4 py-3 align-top">
                        <AnalystNotesReadonly notes={l.notes} />
                      </td>
                      <td className="min-w-0 whitespace-nowrap px-4 py-3 text-lf-text-secondary">
                        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-lf-elevated px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-lf-label ring-1 ring-lf-border">
                          {String(l.qualificationStatus ?? "").replaceAll("_", " ") || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-lf-text-secondary">
                        {l.leadScore ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-lf-text-secondary">
                        {analystFacingSalesLabel(l.salesStage)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <ExecLostNotesReadonly notes={l.lostNotes} />
                      </td>
                      <td className="px-4 py-3 text-xs text-lf-text-secondary">
                        {formatAnalystDate(new Date(l.createdAt))}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {canAssign ? (
                          <AssignToMtlForm
                            leadId={l.id}
                            mainTeamLeads={mtlOptions}
                          />
                        ) : routeTlDisplay ? (
                          routeTlDisplay
                        ) : l.qualificationStatus ===
                          QualificationStatus.NOT_QUALIFIED ? (
                          <span className="text-xs text-lf-warning">
                            Not qualified — cannot route to main team
                          </span>
                        ) : l.qualificationStatus ===
                          QualificationStatus.IRRELEVANT ? (
                          <span className="text-xs text-lf-subtle">
                            Irrelevant — cannot route to main team
                          </span>
                        ) : l.qualificationStatus ===
                            QualificationStatus.QUALIFIED &&
                          l.salesStage === SalesStage.PRE_SALES &&
                          mtlOptions.length === 0 ? (
                          <span className="text-xs text-lf-subtle">
                            Add a main team lead under Members
                          </span>
                        ) : (
                          <span className="text-xs text-lf-subtle">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-lf-text-secondary">
                        {canDirectAssign ? (
                          <AssignDirectToExecForm
                            leadId={l.id}
                            mainTeamLeads={mtlOptions}
                            execOptions={execOptions}
                          />
                        ) : l.assignedSalesExec ? (
                          <span className="font-medium text-lf-text">
                            {l.assignedSalesExec.name}
                          </span>
                        ) : l.qualificationStatus ===
                            QualificationStatus.QUALIFIED &&
                          l.salesStage === SalesStage.PRE_SALES &&
                          mtlOptions.length > 0 &&
                          execOptions.length === 0 ? (
                          <span className="text-lf-subtle">
                            Add sales executives under Team
                          </span>
                        ) : (
                          <span className="text-lf-subtle">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="min-w-[220px] space-y-1 text-xs text-lf-text-secondary">
                          <p>
                            <span className="text-lf-subtle">Lead analyst: </span>
                            {fmtDateTime(l.createdAt)}
                          </p>
                          <p>
                            <span className="text-lf-subtle">ATL pass: </span>
                            {fmtDateTime(
                              l.directAssignedToExecutiveByAtlAt ??
                                l.routedToMainTeamAt,
                            )}
                          </p>
                          <p>
                            <span className="text-lf-subtle">Main TL pass: </span>
                            {l.directAssignedToExecutiveByAtlAt
                              ? "— (direct ATL→SE)"
                              : fmtDateTime(l.assignedToExecutiveAt)}
                          </p>
                          <p>
                            <span className="text-lf-subtle">Sales executive: </span>
                            {fmtDateTime(
                              l.assignedToExecutiveAt ??
                                l.directAssignedToExecutiveByAtlAt,
                            )}
                          </p>
                          <div className="mt-1 border-t border-lf-border pt-1 text-[11px] text-lf-muted">
                            <p>
                              LA → ATL:{" "}
                              {fmtGap(
                                l.createdAt,
                                l.directAssignedToExecutiveByAtlAt ??
                                  l.routedToMainTeamAt,
                              )}
                            </p>
                            <p>
                              ATL → Main TL:{" "}
                              {l.directAssignedToExecutiveByAtlAt
                                ? "Skipped (direct ATL→SE)"
                                : "Instant at routing"}
                            </p>
                            <p>
                              Main TL → SE:{" "}
                              {l.directAssignedToExecutiveByAtlAt
                                ? "Direct by ATL"
                                : fmtGap(l.routedToMainTeamAt, l.assignedToExecutiveAt)}
                            </p>
                          </div>
                        </div>
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
