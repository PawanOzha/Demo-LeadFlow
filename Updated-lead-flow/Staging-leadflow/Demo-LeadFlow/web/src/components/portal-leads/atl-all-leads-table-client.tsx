"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AssignToMtlForm } from "@/components/atl/assign-to-mtl-form";
import { AssignDirectToExecForm } from "@/components/atl/assign-direct-to-exec-form";
import { AtlQualificationSelect } from "@/components/atl/atl-qualification-select";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import ExecLostNotesReadonly from "@/components/exec-lost-notes-readonly";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import { PortalLeadsListToolbar } from "@/components/portal-leads-list-toolbar";
import { QualificationStatus, SalesStage } from "@/lib/constants";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import { LeadSourcePill } from "@/components/lead-source-display";
import { formatAnalystDate } from "@/lib/analyst-ui";
import { analystFacingSalesLabel } from "@/lib/sales-stage-labels";
import { buildAtlLeadsExportPayload } from "@/lib/portal-all-leads-export-payloads";
import { exportFileBase } from "@/lib/dashboard-export-csv";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";
import { PersonWithMiniAvatar } from "@/components/user-mini-avatar";
import { fetchAtlLeadsExportAction } from "@/app/actions/atl";
import { PortalExportConfirmDialog } from "@/components/portal-export-confirm-dialog";
import {
  formatPortalExportKindLabel,
  type PortalExportScope,
} from "@/lib/portal-export-scope";

export type AtlLeadRow = {
  id: string;
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  source: string;
  portalWebsite: string | null;
  notes: string | null;
  lostNotes: string | null;
  qualificationStatus: string;
  leadScore: number | null;
  salesStage: string;
  createdAt: string;
  teamId: string | null;
  assignedMainTeamLeadId: string | null;
  createdBy: { id: string; name: string; image: string | null };
  team: { name: string } | null;
  assignedMainTeamLead: { id: string; name: string; image: string | null } | null;
  assignedSalesExec: { id: string; name: string; image: string | null } | null;
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

export type AtlExportFilters = {
  from: string | null;
  to: string | null;
  status: string | null;
  analystId: string | null;
  source: string | null;
  website?: string | null;
  q: string | null;
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
  rangeTotalCount,
  hasServerFilters = false,
  exportFilters,
  exportScope,
  hideClientSearch = false,
  toolbarPagination,
}: {
  leads: AtlLeadRow[];
  initialQ: string | null;
  from: string | null;
  to: string | null;
  analystIdsEmpty: boolean;
  mtlOptions: MtlOption[];
  execOptions: ExecOption[];
  rangeLabel: string;
  rangeTotalCount: number;
  /** True when status / analyst / source filters are applied (server-side). */
  hasServerFilters?: boolean;
  exportFilters: AtlExportFilters;
  exportScope: PortalExportScope;
  /** When true, parent owns debounced `q` (e.g. portal top-panel search). */
  hideClientSearch?: boolean;
  toolbarPagination: ReactNode;
}) {
  const [query, setQuery] = useState(initialQ ?? "");
  useDebouncedLeadSearchUrl(query, 400, undefined, !hideClientSearch);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingKind, setPendingKind] = useState<"csv" | "xlsx" | "pdf" | null>(null);

  const runExport = useCallback(
    async (kind: "csv" | "xlsx" | "pdf") => {
      setExportBusy(kind);
      setExportError(null);
      setExportOpen(false);
      try {
        const result = await fetchAtlLeadsExportAction(exportFilters);
        if (!result.ok) {
          setExportError(result.error);
          return;
        }
        const payload = buildAtlLeadsExportPayload(result.rows, {
          rangeLabel,
          searchQuery: exportFilters.q ?? "",
          rangeTotalCount,
          exportRowCount: result.rows.length,
        });
        const base = exportFileBase(payload);
        if (kind === "csv") {
          const { buildDashboardCsv } = await import("@/lib/dashboard-export-csv");
          const csv = `﻿${buildDashboardCsv(payload)}`;
          const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
          const a = document.createElement("a");
          a.href = url; a.download = `${base}.csv`; a.rel = "noopener";
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        } else {
          const { buildDashboardPdf, buildDashboardXlsx } = await import("@/lib/dashboard-export-heavy");
          const blob = kind === "xlsx" ? buildDashboardXlsx(payload) : buildDashboardPdf(payload);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `${base}.${kind}`; a.rel = "noopener";
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        setExportError(e instanceof Error ? e.message : "Export failed. Please try again.");
      } finally {
        setExportBusy(null);
      }
    },
    [exportFilters, rangeLabel, rangeTotalCount],
  );

  const requestExport = useCallback(
    (kind: "csv" | "xlsx" | "pdf") => {
      setExportError(null);
      setExportOpen(false);
      if (!exportScope.hasActiveFilters) {
        setPendingKind(kind);
        setConfirmOpen(true);
        return;
      }
      void runExport(kind);
    },
    [exportScope.hasActiveFilters, runExport],
  );

  const dismissConfirm = () => {
    setConfirmOpen(false);
    setPendingKind(null);
  };

  const confirmExportAllInScope = () => {
    const k = pendingKind;
    dismissConfirm();
    if (k) void runExport(k);
  };

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

  const td =
    "border-b border-lf-divide px-3 py-2.5 align-middle text-center text-[13px] leading-snug text-lf-text-secondary first:pl-4 last:pr-4";
  const tdLeft =
    "border-b border-lf-divide px-3 py-2.5 align-middle text-left text-[13px] leading-snug text-lf-text-secondary first:pl-4 last:pr-4";
  const th =
    "border-b border-lf-border bg-lf-bg/95 px-3 py-2.5 text-center align-middle text-[10px] font-semibold uppercase tracking-wider text-lf-muted first:pl-4 last:pr-4";
  const thLeft =
    "border-b border-lf-border bg-lf-bg/95 px-3 py-2.5 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-lf-muted first:pl-4 last:pr-4";
  const routePanel =
    "rounded-lg border border-lf-border/80 bg-lf-elevated/45 px-2.5 py-2 shadow-sm";
  const routeLbl =
    "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-lf-muted";
  const hintBox =
    "rounded-md border border-lf-border/70 bg-lf-bg/55 px-2 py-1.5 text-[11px] leading-snug text-lf-text-secondary";

  const exportTrailing = (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setExportOpen((o) => !o)}
        disabled={exportBusy !== null}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
      >
        {exportBusy ? (
          <span className="text-lf-muted">Exporting…</span>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 text-lf-muted" aria-hidden />
            Export
          </>
        )}
      </button>
      {exportOpen && !exportBusy ? (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-hidden
            onClick={() => setExportOpen(false)}
          />
          <div
            role="menu"
            aria-label="Export formats"
            className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-xl border border-lf-border bg-lf-surface py-1 shadow-xl"
          >
            {(["pdf", "xlsx", "csv"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="menuitem"
                className="h-9 block w-full px-3 text-left text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover hover:text-lf-text"
                onClick={() => requestExport(k)}
              >
                {k === "pdf" ? "PDF" : k === "xlsx" ? "Excel (.xlsx)" : "CSV"}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <>
      <PortalExportConfirmDialog
        open={confirmOpen}
        title="Export without filters?"
        subtitle="Nothing is narrowing this export yet. Add a date range, search, or list filters first to export only what you need, or export everything that matches your team (up to the row cap)."
        bulletLines={
          exportScope.bulletLines.length
            ? exportScope.bulletLines
            : ["No active filters detected."]
        }
        pendingFormatLabel={pendingKind ? formatPortalExportKindLabel(pendingKind) : null}
        onClose={dismissConfirm}
        onAddFilters={dismissConfirm}
        onExportAllAnyway={confirmExportAllInScope}
      />
      <PortalLeadsTableScrollHint />
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
        <PortalLeadsListToolbar
          pagination={toolbarPagination}
          search={
            hideClientSearch ? undefined : (
              <PortalLeadSearchLiveField variant="inline" value={query} onChange={setQuery} />
            )
          }
          trailing={exportTrailing}
        />
        {exportError ? (
          <div
            className="border-b border-lf-danger-border bg-lf-danger-bg px-3 py-1.5 text-xs text-lf-danger"
            role="alert"
          >
            {exportError}
          </div>
        ) : null}
        <div
          className={portalDataTableScrollClass}
          role="region"
          aria-label="Analyst team leads table"
          tabIndex={0}
        >
          <table className="w-full min-w-[1400px] border-collapse [&_tbody_tr:last-child_td]:border-b-0">
            <thead className="sticky top-0 z-[1] shadow-[0_1px_0_0] shadow-lf-border">
              <tr className="bg-lf-bg">
                <th className={`${th} min-w-[160px]`}>Source</th>
                <th className={`${th} min-w-[132px]`}>Portal</th>
                <th className={`${th} min-w-[120px]`}>Name</th>
                <th className={`${th} min-w-[100px]`}>Analyst</th>
                <th className={`${th} min-w-[104px]`}>Phone</th>
                <th className={`${th} min-w-[152px]`}>Email</th>
                <th className={`${thLeft} min-w-[11rem] max-w-[28rem]`}>
                  Analyst notes
                </th>
                <th className={`${th} min-w-[10rem]`}>
                  Qualification
                </th>
                <th className={`${th} min-w-[64px]`}>Score</th>
                <th className={`${th} min-w-[112px]`}>Sales status</th>
                <th className={`${thLeft} min-w-[168px]`}>Executive notes</th>
                <th className={`${th} min-w-[104px]`}>Added</th>
                <th className={`${th} min-w-[11rem] max-w-[13rem]`}>
                  Route TL
                </th>
                <th className={`${th} min-w-[12rem] max-w-[15rem]`}>
                  Route SE
                </th>
                <th className={`${thLeft} min-w-[220px]`}>
                  Pass timeline / gap
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="px-4 py-16 align-middle text-center text-[13px] text-lf-muted"
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
              ) : (
                leads.map((l) => {
                  const canAssign =
                    l.qualificationStatus === QualificationStatus.QUALIFIED &&
                    l.salesStage === SalesStage.PRE_SALES &&
                    mtlOptions.length > 0;
                  const canDirectAssign = canAssign && execOptions.length > 0;
                  const hasMainRoute =
                    Boolean(l.teamId || l.assignedMainTeamLeadId);
                  const teamLabel = l.team?.name ?? null;
                  const routeTlTeamOnly =
                    hasMainRoute && teamLabel ? (
                      <p className="max-w-[220px] text-xs font-medium text-lf-text">
                        {teamLabel}
                      </p>
                    ) : hasMainRoute && !teamLabel ? (
                      <span className="text-xs text-lf-subtle">—</span>
                    ) : null;
                  return (
                    <tr
                      key={l.id}
                      className="group align-middle transition-colors hover:bg-lf-row-hover"
                    >
                      <td className={`${td} min-w-0 max-w-[260px]`}>
                        <LeadSourcePill source={l.source} />
                      </td>
                      <td className={`${td} max-w-[min(14rem,26vw)] text-[12px]`}>
                        <span className="block truncate" title={l.portalWebsite ?? undefined}>
                          {l.portalWebsite ?? "—"}
                        </span>
                      </td>
                      <td
                        className={`${td} min-w-[140px] max-w-[min(16rem,40vw)] font-semibold text-lf-text break-words [overflow-wrap:anywhere]`}
                      >
                        {l.leadName || "—"}
                      </td>
                      <td className={`${td} min-w-0`}>
                        <div className="flex justify-center">
                          <PersonWithMiniAvatar
                            id={l.createdBy.id.trim() || l.id}
                            name={l.createdBy.name}
                            image={l.createdBy.image}
                          />
                        </div>
                      </td>
                      <td className={`${td} min-w-0 whitespace-nowrap`}>
                        {l.phone || "—"}
                      </td>
                      <td className={`${td} min-w-0 max-w-[220px]`}>
                        <span
                          className="block truncate"
                          title={l.leadEmail ?? undefined}
                        >
                          {l.leadEmail || "—"}
                        </span>
                      </td>
                      <td className={`${tdLeft} min-w-0 max-w-[28rem]`}>
                        <AnalystNotesReadonly notes={l.notes} />
                      </td>
                      <td className={`${td} min-w-[10rem] max-w-[12rem]`}>
                        <AtlQualificationSelect
                          leadId={l.id}
                          value={l.qualificationStatus}
                        />
                      </td>
                      <td className={`${td} tabular-nums`}>{l.leadScore ?? "—"}</td>
                      <td className={td}>{analystFacingSalesLabel(l.salesStage)}</td>
                      <td className={`${tdLeft} min-w-0`}>
                        <ExecLostNotesReadonly notes={l.lostNotes} />
                      </td>
                      <td className={`${td} text-xs`}>
                        {formatAnalystDate(new Date(l.createdAt))}
                      </td>
                      <td className={`${td} min-w-0 max-w-[13rem]`}>
                        {canAssign ? (
                          <div className={routePanel}>
                            <span className={routeLbl}>Assign to main team</span>
                            <AssignToMtlForm
                              leadId={l.id}
                              mainTeamLeads={mtlOptions}
                              compact
                            />
                          </div>
                        ) : routeTlTeamOnly ? (
                          <div className={routePanel}>
                            <span className={routeLbl}>Routed team</span>
                            {routeTlTeamOnly}
                          </div>
                        ) : l.qualificationStatus ===
                          QualificationStatus.NOT_QUALIFIED ? (
                          <p className={`${hintBox} text-lf-warning`}>
                            Not qualified — cannot route to main team
                          </p>
                        ) : l.qualificationStatus ===
                          QualificationStatus.IRRELEVANT ? (
                          <p className={`${hintBox} text-lf-subtle`}>
                            Irrelevant — cannot route to main team
                          </p>
                        ) : l.qualificationStatus ===
                            QualificationStatus.QUALIFIED &&
                          l.salesStage === SalesStage.PRE_SALES &&
                          mtlOptions.length === 0 ? (
                          <p className={`${hintBox} text-lf-subtle`}>
                            Add a main team lead under Members
                          </p>
                        ) : (
                          <span className="text-xs text-lf-subtle">—</span>
                        )}
                      </td>
                      <td className={`${td} min-w-0 max-w-[15rem] text-xs`}>
                        <div className={routePanel}>
                          {l.assignedMainTeamLead ? (
                            <div>
                              <span className={routeLbl}>Team lead</span>
                              <div className="flex justify-center">
                                <PersonWithMiniAvatar
                                  id={l.assignedMainTeamLead.id}
                                  name={l.assignedMainTeamLead.name}
                                  image={l.assignedMainTeamLead.image}
                                  size={22}
                                />
                              </div>
                            </div>
                          ) : null}
                          <div
                            className={
                              l.assignedMainTeamLead
                                ? "mt-2 border-t border-lf-border/70 pt-2"
                                : ""
                            }
                          >
                            <span className={routeLbl}>Sales executive</span>
                            <div className="mt-0.5">
                              {canDirectAssign ? (
                                <AssignDirectToExecForm
                                  leadId={l.id}
                                  mainTeamLeads={mtlOptions}
                                  execOptions={execOptions}
                                  compact
                                />
                              ) : l.assignedSalesExec ? (
                                <div className="flex justify-center">
                                  <PersonWithMiniAvatar
                                    id={l.assignedSalesExec.id}
                                    name={l.assignedSalesExec.name}
                                    image={l.assignedSalesExec.image}
                                    size={22}
                                  />
                                </div>
                              ) : l.qualificationStatus ===
                                  QualificationStatus.QUALIFIED &&
                                l.salesStage === SalesStage.PRE_SALES &&
                                mtlOptions.length > 0 &&
                                execOptions.length === 0 ? (
                                <span className="text-[11px] leading-snug text-lf-subtle">
                                  Add sales executives under Team
                                </span>
                              ) : (
                                <span className="text-[11px] text-lf-subtle">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`${tdLeft} min-w-[220px]`}>
                        <div className={`${hintBox} space-y-2`}>
                          <div className="grid gap-1 text-[11px] leading-snug">
                            <p>
                              <span className="font-medium text-lf-muted">Lead analyst </span>
                              <span>{fmtDateTime(l.createdAt)}</span>
                            </p>
                            <p>
                              <span className="font-medium text-lf-muted">ATL pass </span>
                              <span>
                                {fmtDateTime(
                                  l.directAssignedToExecutiveByAtlAt ??
                                    l.routedToMainTeamAt,
                                )}
                              </span>
                            </p>
                            <p>
                              <span className="font-medium text-lf-muted">Main TL pass </span>
                              <span>
                                {l.directAssignedToExecutiveByAtlAt
                                  ? "— (direct ATL→SE)"
                                  : fmtDateTime(l.assignedToExecutiveAt)}
                              </span>
                            </p>
                            <p>
                              <span className="font-medium text-lf-muted">Sales exec </span>
                              <span>
                                {fmtDateTime(
                                  l.assignedToExecutiveAt ??
                                    l.directAssignedToExecutiveByAtlAt,
                                )}
                              </span>
                            </p>
                          </div>
                          <div className="grid gap-0.5 border-t border-lf-border/60 pt-2 text-[11px] text-lf-muted">
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
      </div>
    </>
  );
}
