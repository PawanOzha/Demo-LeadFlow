"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";
import {
  buildDashboardCsv,
  exportFileBase,
} from "@/lib/dashboard-export-csv";
import {
  formatPortalExportKindLabel,
  type PortalExportScope,
} from "@/lib/portal-export-scope";
import { PortalExportConfirmDialog } from "@/components/portal-export-confirm-dialog";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DashboardReportExport({
  payload,
  exportScope,
}: {
  payload: DashboardExportPayload;
  /**
   * When set and `hasActiveFilters` is false, choosing a format opens a short
   * confirmation so users can narrow filters or explicitly export the full in-scope dataset.
   */
  exportScope?: PortalExportScope | null;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [busy, setBusy] = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingKind, setPendingKind] = useState<"csv" | "xlsx" | "pdf" | null>(
    null,
  );

  const run = useCallback(
    async (kind: "csv" | "xlsx" | "pdf") => {
      setBusy(kind);
      setExportError(null);
      let base: string;
      try {
        base = exportFileBase(payload);
      } catch {
        base = `export-${Date.now()}`;
      }
      try {
        if (kind === "csv") {
          const csv = `\uFEFF${buildDashboardCsv(payload)}`;
          downloadBlob(
            new Blob([csv], { type: "text/csv;charset=utf-8" }),
            `${base}.csv`,
          );
        } else {
          const { buildDashboardPdf, buildDashboardXlsx } = await import(
            "@/lib/dashboard-export-heavy"
          );
          if (kind === "xlsx") {
            downloadBlob(buildDashboardXlsx(payload), `${base}.xlsx`);
          } else {
            downloadBlob(buildDashboardPdf(payload), `${base}.pdf`);
          }
        }
      } catch (e) {
        setExportError(
          e instanceof Error ? e.message : "Export failed. Please try again.",
        );
      } finally {
        setBusy(null);
        setOpen(false);
      }
    },
    [payload],
  );

  const requestKind = useCallback(
    (kind: "csv" | "xlsx" | "pdf") => {
      if (exportScope && !exportScope.hasActiveFilters) {
        setPendingKind(kind);
        setConfirmOpen(true);
        setOpen(false);
        return;
      }
      void run(kind);
    },
    [exportScope, run],
  );

  const dismissConfirm = () => {
    setConfirmOpen(false);
    setPendingKind(null);
  };

  const confirmExportAllInScope = () => {
    const k = pendingKind;
    dismissConfirm();
    if (k) void run(k);
  };

  useLayoutEffect(() => {
    if (!open || busy) {
      setMenuPlacement(null);
      return;
    }
    const MENU_MIN_W = 176; /* 11rem, matches Tailwind min-w-[11rem] */

    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuPlacement({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - MENU_MIN_W),
      });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, busy]);

  const menuPortal =
    typeof document !== "undefined" &&
    open &&
    !busy &&
    menuPlacement != null ? (
      createPortal(
        <>
          <div
            className="fixed inset-0 z-[120] cursor-default bg-transparent"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="Export formats"
            style={{
              top: menuPlacement.top,
              left: menuPlacement.left,
            }}
            className="fixed z-[130] min-w-[11rem] rounded-xl border border-lf-border bg-lf-surface py-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              className="h-9 block w-full px-3 text-left text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover hover:text-lf-text"
              onClick={() => requestKind("pdf")}
            >
              PDF
            </button>
            <button
              type="button"
              role="menuitem"
              className="h-9 block w-full px-3 text-left text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover hover:text-lf-text"
              onClick={() => requestKind("xlsx")}
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              role="menuitem"
              className="h-9 block w-full px-3 text-left text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover hover:text-lf-text"
              onClick={() => requestKind("csv")}
            >
              CSV
            </button>
          </div>
        </>,
        document.body,
      )
    ) : null;

  return (
    <>
      <div ref={anchorRef} className="relative" data-dashboard-export>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={busy !== null}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
        >
          {busy ? (
            <span className="text-lf-muted">Exporting…</span>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 text-lf-muted" aria-hidden />
              Export
            </>
          )}
        </button>
        {menuPortal}
        {exportError ? (
          <p className="mt-2 max-w-xs text-xs text-lf-danger" role="alert">
            {exportError}
          </p>
        ) : null}
      </div>
      <PortalExportConfirmDialog
        open={confirmOpen}
        title="Export without filters?"
        subtitle="Nothing is narrowing this export yet. Add a date range, search, or list filters first to export only what you need, or export everything that matches your role (subject to caps in each file)."
        bulletLines={
          exportScope?.bulletLines.length
            ? exportScope.bulletLines
            : ["No active filters detected."]
        }
        pendingFormatLabel={pendingKind ? formatPortalExportKindLabel(pendingKind) : null}
        onClose={dismissConfirm}
        onAddFilters={dismissConfirm}
        onExportAllAnyway={confirmExportAllInScope}
      />
    </>
  );
}
