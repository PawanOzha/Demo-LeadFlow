"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import { SuperadminLeadsFiltersBar } from "@/components/superadmin/superadmin-leads-filters";
import type { SuperadminLeadsParsed } from "@/lib/superadmin-leads-filters";
import { buildSuperadminLeadsExportPayload } from "@/lib/portal-all-leads-export-payloads";
import { exportFileBase } from "@/lib/dashboard-export-csv";
import { fetchSuperadminLeadsExportAction } from "@/app/actions/superadmin";
import {
  PortalDashboardTopPanel,
  PortalDashboardTopPanelActions,
} from "@/components/portal-dashboard-top-panel";
import { PortalExportConfirmDialog } from "@/components/portal-export-confirm-dialog";
import {
  formatPortalExportKindLabel,
  type PortalExportScope,
} from "@/lib/portal-export-scope";

type TeamOpt = { id: string; name: string };
type ExecOpt = { id: string; name: string; email: string };
type AnalystOpt = { id: string; name: string; email: string };

export function SuperadminLeadsToolbar({
  showExport,
  totalCount,
  filterSummary,
  filtersKey,
  initial,
  analysts,
  teams,
  execs,
  exportScope,
}: {
  showExport: boolean;
  totalCount: number;
  filterSummary: string;
  filtersKey: string;
  initial: SuperadminLeadsParsed;
  analysts: AnalystOpt[];
  teams: TeamOpt[];
  execs: ExecOpt[];
  exportScope: PortalExportScope;
}) {
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingKind, setPendingKind] = useState<"csv" | "xlsx" | "pdf" | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const runExport = useCallback(
    async (kind: "csv" | "xlsx" | "pdf") => {
      setExportBusy(kind);
      setExportError(null);
      setExportOpen(false);
      try {
        const { from, to, q, duplicatePhonesOnly, status, analystId, teamId, execId } = initial;
        const result = await fetchSuperadminLeadsExportAction({
          filters: { from, to, q, duplicatePhonesOnly, status, analystId, teamId, execId },
          filterSummary,
        });
        if (!result.ok) {
          setExportError(result.error);
          return;
        }
        const payload = buildSuperadminLeadsExportPayload(result.rows, {
          filterSummary: result.filterSummary,
          rangeTotalCount: totalCount,
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
    [initial, filterSummary, totalCount],
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

  return (
    <>
      <PortalDashboardTopPanel>
        <PortalDashboardTopPanelActions
          start={
            showExport ? (
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
                      className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-xl border border-lf-border bg-lf-surface py-1 shadow-xl"
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
                {exportError ? (
                  <p className="mt-2 max-w-xs text-xs text-lf-danger" role="alert">
                    {exportError}
                  </p>
                ) : null}
              </div>
            ) : null
          }
          end={
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="superadmin-leads-filter-panel"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-lf-border bg-lf-bg/80 px-4 text-[13px] font-medium text-lf-text-secondary shadow-sm transition-colors hover:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand/25"
            >
              <Filter className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Filters
            </button>
          }
        />
      </PortalDashboardTopPanel>

      <PortalExportConfirmDialog
        open={confirmOpen}
        title="Export without filters?"
        subtitle="Use the Filters drawer to narrow by date, search, duplicates, qualification, analyst, team, or sales executive—or export everything that matches your current defaults (still respects the journey export cap)."
        bulletLines={
          exportScope.bulletLines.length
            ? exportScope.bulletLines
            : ["No active filters detected."]
        }
        pendingFormatLabel={
          pendingKind ? formatPortalExportKindLabel(pendingKind) : null
        }
        onClose={dismissConfirm}
        onAddFilters={() => {
          dismissConfirm();
          setOpen(true);
        }}
        onExportAllAnyway={confirmExportAllInScope}
      />

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-stretch sm:justify-end">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 z-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <div
            id="superadmin-leads-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="superadmin-leads-filter-title"
            className="relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col rounded-t-2xl border border-lf-border bg-lf-surface shadow-2xl sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-lf-border px-4 py-3">
              <h2
                id="superadmin-leads-filter-title"
                className="text-[15px] font-semibold text-lf-text"
              >
                Filter leads
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lf-muted transition-colors hover:bg-lf-row-hover hover:text-lf-text focus:outline-none focus:ring-2 focus:ring-lf-brand/25"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-8">
              <SuperadminLeadsFiltersBar
                key={filtersKey}
                initial={initial}
                analysts={analysts}
                teams={teams}
                execs={execs}
                variant="drawer"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
