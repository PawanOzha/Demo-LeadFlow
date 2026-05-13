"use client";

import { X } from "lucide-react";

export function PortalExportConfirmDialog({
  open,
  title,
  subtitle,
  bulletLines,
  pendingFormatLabel,
  onClose,
  onAddFilters,
  onExportAllAnyway,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  bulletLines: string[];
  pendingFormatLabel: string | null;
  onClose: () => void;
  /** Closes dialog so the user can narrow date / search / filters first. */
  onAddFilters: () => void;
  onExportAllAnyway: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-export-confirm-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="portal-export-confirm-title"
            className="text-[15px] font-semibold text-lf-text"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-lf-muted hover:bg-lf-row-hover hover:text-lf-text focus:outline-none focus:ring-2 focus:ring-lf-brand/30"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-lf-muted">{subtitle}</p>
        <ul className="mt-3 max-h-40 list-inside list-disc space-y-1 overflow-y-auto rounded-lg border border-lf-border bg-lf-bg/80 px-3 py-2 text-[13px] text-lf-text-secondary">
          {bulletLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        {pendingFormatLabel ? (
          <p className="mt-3 text-xs text-lf-subtle">
            Format:&nbsp;
            <span className="font-medium text-lf-text">{pendingFormatLabel}</span>
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-lf-border pt-4">
          <button
            type="button"
            onClick={onAddFilters}
            className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary hover:bg-lf-row-hover"
          >
            Add filters
          </button>
          <button
            type="button"
            onClick={onExportAllAnyway}
            className="h-9 rounded-lg bg-lf-brand px-4 text-[13px] font-semibold text-white hover:opacity-95"
          >
            Export all in scope
          </button>
        </div>
      </div>
    </div>
  );
}
