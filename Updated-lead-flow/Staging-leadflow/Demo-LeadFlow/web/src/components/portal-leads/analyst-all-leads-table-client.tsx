"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import AnalystQualificationSelect from "@/components/analyst/analyst-qualification-select";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import ExecLostNotesReadonly from "@/components/exec-lost-notes-readonly";
import { PortalLeadSearchLiveField } from "@/components/portal-lead-search-live-field";
import { PortalLeadsListToolbar } from "@/components/portal-leads-list-toolbar";
import { useDebouncedLeadSearchUrl } from "@/lib/use-debounced-lead-search-url";
import { LeadSourcePill } from "@/components/lead-source-display";
import { formatAnalystDate } from "@/lib/analyst-ui";
import { analystFacingSalesLabel } from "@/lib/sales-stage-labels";
import { buildAnalystLeadsExportPayload } from "@/lib/portal-all-leads-export-payloads";
import { exportFileBase } from "@/lib/dashboard-export-csv";
import { portalDataTableScrollClass } from "@/lib/app-shell-ui";
import { PortalLeadsTableScrollHint } from "@/components/portal-leads/portal-leads-table-scroll-hint";
import { formatDealMoney } from "@/lib/deal-money";
import { fetchAnalystLeadsExportAction } from "@/app/actions/leads-analyst";
import { PortalExportConfirmDialog } from "@/components/portal-export-confirm-dialog";
import {
  formatPortalExportKindLabel,
  type PortalExportScope,
} from "@/lib/portal-export-scope";

export type AnalystAllLeadsRow = {
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
  estimatedDealValue: number | null;
  closedRevenue: number | null;
  dealCurrency: string;
};

export type AnalystExportFilters = {
  from: string | null;
  to: string | null;
  q: string | null;
  status?: string | null;
  salesStage?: string | null;
  source?: string | null;
  website?: string | null;
};

export function AnalystAllLeadsTableClient({
  leads,
  initialQ,
  from,
  to,
  rangeLabel,
  exportFilters,
  exportScope,
  rangeTotalCount,
  hideClientSearch = false,
  toolbarPagination,
}: {
  leads: AnalystAllLeadsRow[];
  initialQ: string | null;
  from: string | null;
  to: string | null;
  rangeLabel: string;
  exportFilters: AnalystExportFilters;
  exportScope: PortalExportScope;
  rangeTotalCount: number;
  /** When true, parent owns debounced `q` (e.g. portal dashboard search). */
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
        const result = await fetchAnalystLeadsExportAction(exportFilters);
        if (!result.ok) {
          setExportError(result.error);
          return;
        }
        const payload = buildAnalystLeadsExportPayload(result.rows, {
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
        subtitle="Nothing is narrowing this export yet. Add a date range, search, or list filters first to export only what you need, or export everything that matches your role (up to the row cap)."
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
          aria-label="Your leads table"
          tabIndex={0}
        >
          <table className="w-full min-w-[1180px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-lf-border bg-lf-bg/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Source</th>
                <th className="min-w-[140px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Portal</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Phone</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Email</th>
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
                    colSpan={13}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    {from || to
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
                    <td className="min-w-0 max-w-[260px] px-4 py-3 align-top text-[13px] text-lf-text-secondary">
                      <LeadSourcePill source={l.source} />
                    </td>
                    <td className="max-w-[min(14rem,30vw)] px-4 py-3 align-top text-[12px] text-lf-text-secondary">
                      <span className="block truncate" title={l.portalWebsite ?? undefined}>
                        {l.portalWebsite ?? "—"}
                      </span>
                    </td>
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
      </div>
    </>
  );
}
