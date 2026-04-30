"use client";

import { useCallback, useMemo, useState } from "react";
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";
import {
  buildDashboardCsv,
  exportFileBase,
} from "@/lib/dashboard-export-csv";

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
}: {
  payload: DashboardExportPayload;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const base = useMemo(() => {
    try {
      return exportFileBase(payload);
    } catch {
      return `export-${Date.now()}`;
    }
  }, [payload]);

  const run = useCallback(
    async (kind: "csv" | "xlsx" | "pdf") => {
      setBusy(kind);
      setExportError(null);
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
        console.error("[DashboardReportExport]", e);
        setExportError(
          e instanceof Error ? e.message : "Export failed. Please try again.",
        );
      } finally {
        setBusy(null);
        setOpen(false);
      }
    },
    [payload, base],
  );

  return (
    <div className="relative" data-dashboard-export>
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
            <svg
              className="h-4 w-4 text-lf-muted"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Export
          </>
        )}
      </button>
      {open && !busy ? (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-xl border border-lf-border bg-lf-surface py-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              className="h-9 block w-full px-3 text-left text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover hover:text-lf-text"
              onClick={() => void run("pdf")}
            >
              PDF
            </button>
            <button
              type="button"
              role="menuitem"
              className="h-9 block w-full px-3 text-left text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover hover:text-lf-text"
              onClick={() => void run("xlsx")}
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              role="menuitem"
              className="h-9 block w-full px-3 text-left text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover hover:text-lf-text"
              onClick={() => void run("csv")}
            >
              CSV
            </button>
          </div>
        </>
      ) : null}
      {exportError ? (
        <p className="mt-2 max-w-xs text-xs text-lf-danger" role="alert">
          {exportError}
        </p>
      ) : null}
    </div>
  );
}
