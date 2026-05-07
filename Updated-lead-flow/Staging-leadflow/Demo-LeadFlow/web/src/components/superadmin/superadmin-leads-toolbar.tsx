"use client";

import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";
import { SuperadminLeadsFiltersBar } from "@/components/superadmin/superadmin-leads-filters";
import type { SuperadminLeadsParsed } from "@/lib/superadmin-leads-filters";

type TeamOpt = { id: string; name: string };
type ExecOpt = { id: string; name: string; email: string };
type AnalystOpt = { id: string; name: string; email: string };

export function SuperadminLeadsToolbar({
  showExport,
  exportPayload,
  filtersKey,
  initial,
  analysts,
  teams,
  execs,
}: {
  showExport: boolean;
  exportPayload: DashboardExportPayload;
  filtersKey: string;
  initial: SuperadminLeadsParsed;
  analysts: AnalystOpt[];
  teams: TeamOpt[];
  execs: ExecOpt[];
}) {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lf-border bg-lf-surface px-4 py-3 shadow-sm">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {showExport ? (
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-lf-subtle">
                Export
              </span>
              <DashboardReportExport payload={exportPayload} />
            </div>
          ) : (
            <p className="text-[13px] text-lf-muted">
              Use filters to narrow leads; switch to Journey table to export.
            </p>
          )}
        </div>
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
      </div>

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
