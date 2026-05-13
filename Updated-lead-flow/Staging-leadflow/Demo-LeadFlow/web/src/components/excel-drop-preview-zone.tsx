"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";

/** Successful parse payload for the preview table. */
export type ExcelDropPreviewData = {
  headers: string[];
  rows: string[][];
  summaryLine: string;
  /** When true, primary action stays disabled. */
  disableImport?: boolean;
  /** Optional warning lines (e.g. missing columns). */
  alerts?: string[];
};

export type ExcelDropPreviewParseResult =
  | { ok: true; data: ExcelDropPreviewData }
  | { ok: false; error: string };

export type ExcelDropPreviewZoneProps = {
  /** Input accept list, e.g. Excel MIME types. */
  accept: string;
  /** Shown on the hidden file input. */
  fileInputAriaLabel?: string;
  parseFile: (file: File) => Promise<ExcelDropPreviewParseResult>;
  /** Return `true` to clear the selection after a successful import. */
  onImport: (file: File) => Promise<boolean>;
  importLabel?: string;
  importPendingLabel?: string;
  /** Entire zone disabled (e.g. parent loading). */
  disabled?: boolean;
  dropTitle?: string;
  dropHint?: string;
  maxSizeHint?: string;
  className?: string;
  /** Optional content above the dashed area (e.g. section title). */
  children?: ReactNode;
  id?: string;
};

/**
 * Single bordered drop zone: drag/drop + browse, selected file + remove, preview table, errors, import — reusable across portals.
 */
export function ExcelDropPreviewZone({
  accept,
  fileInputAriaLabel = "Choose file",
  parseFile,
  onImport,
  importLabel = "Import",
  importPendingLabel = "Working…",
  disabled = false,
  dropTitle = "Drag and drop your file here",
  dropHint = "or browse — preview appears below before you continue",
  maxSizeHint,
  className = "",
  children,
  id,
}: ExcelDropPreviewZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [importPending, setImportPending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExcelDropPreviewData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const busy = disabled || previewBusy || importPending;

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setParseError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const loadFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setParseError(null);
      setPreview(null);
      setPreviewBusy(true);
      try {
        const result = await parseFile(file);
        if (!result.ok) {
          setParseError(result.error);
          setSelectedFile(null);
          return;
        }
        setSelectedFile(file);
        setPreview(result.data);
      } finally {
        setPreviewBusy(false);
      }
    },
    [parseFile],
  );

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      void loadFile(f ?? null);
    },
    [loadFile],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      void loadFile(f ?? null);
    },
    [loadFile],
  );

  const canImport =
    Boolean(selectedFile) &&
    preview !== null &&
    !parseError &&
    !preview.disableImport &&
    !busy;

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!selectedFile || !canImport) return;
      setImportPending(true);
      try {
        const ok = await onImport(selectedFile);
        if (ok) clearFile();
      } finally {
        setImportPending(false);
      }
    },
    [selectedFile, canImport, onImport, clearFile],
  );

  const openPicker = useCallback(() => {
    if (!busy) inputRef.current?.click();
  }, [busy]);

  return (
    <div className={className} id={id}>
      {children}
      <form onSubmit={onSubmit} className="mt-0">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          aria-label={fileInputAriaLabel}
          disabled={busy}
          onChange={onInputChange}
        />

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed transition-colors ${
            dragOver
              ? "border-lf-brand bg-lf-brand/5"
              : "border-lf-border bg-lf-bg/30"
          } ${busy ? "opacity-60" : ""}`}
        >
          {!selectedFile ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-lf-text">{dropTitle}</p>
              {maxSizeHint ? (
                <p className="mt-2 text-xs text-lf-subtle">{maxSizeHint}</p>
              ) : null}
              <p className="mt-2 text-xs text-lf-muted">{dropHint}</p>
              <button
                type="button"
                onClick={openPicker}
                disabled={busy}
                className="mt-4 rounded-xl border border-lf-border bg-lf-surface px-5 py-2.5 text-sm font-medium text-lf-text-secondary shadow-sm transition hover:bg-lf-row-hover disabled:opacity-50"
              >
                Browse files
              </button>
              {previewBusy ? (
                <p className="mt-3 text-xs text-lf-link">Reading file…</p>
              ) : null}
              {parseError ? (
                <p className="mt-4 text-sm text-lf-danger" role="alert">
                  {parseError}
                </p>
              ) : null}
            </div>
          ) : (
            <div
              className="space-y-4 p-4 sm:p-5"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-lf-border pb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-lf-muted">
                    Selected file
                  </p>
                  <p className="truncate text-sm font-semibold text-lf-text">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-lf-subtle">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openPicker}
                    disabled={busy}
                    className="rounded-lg border border-lf-border bg-lf-surface px-3 py-1.5 text-xs font-medium text-lf-text-secondary hover:bg-lf-row-hover disabled:opacity-50"
                  >
                    Replace file
                  </button>
                  <button
                    type="button"
                    onClick={clearFile}
                    disabled={busy}
                    className="rounded-lg border border-lf-border bg-lf-surface px-3 py-1.5 text-xs font-medium text-lf-danger hover:bg-lf-danger/5 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-lf-border bg-lf-surface/80">
                {preview?.alerts?.length ? (
                  <div
                    role="alert"
                    className="border-b border-lf-warning/40 bg-lf-warning/10 px-3 py-3 text-xs text-lf-warning"
                  >
                    {preview.alerts.map((a, i) => (
                      <p key={i} className="text-lf-text-secondary">
                        {a}
                      </p>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lf-border px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-lf-muted">
                    Preview
                  </p>
                  {preview ? (
                    <p className="text-xs text-lf-subtle">{preview.summaryLine}</p>
                  ) : null}
                </div>
                <div className="max-h-64 overflow-auto">
                  {preview ? (
                    <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
                      <thead>
                        <tr className="sticky top-0 border-b border-lf-border bg-lf-surface">
                          {preview.headers.map((h, i) => (
                            <th
                              key={`h-${i}`}
                              className="whitespace-nowrap px-2 py-2 font-semibold text-lf-muted"
                            >
                              {h || `Col ${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-lf-text-secondary">
                        {preview.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={Math.max(preview.headers.length, 1)}
                              className="px-4 py-8 text-center text-lf-muted"
                            >
                              No data rows after the header.
                            </td>
                          </tr>
                        ) : (
                          preview.rows.map((cells, ri) => (
                            <tr
                              key={`r-${ri}`}
                              className="border-b border-lf-divide last:border-0"
                            >
                              {cells.map((cell, ci) => (
                                <td
                                  key={`c-${ri}-${ci}`}
                                  className="max-w-[140px] px-2 py-1.5"
                                >
                                  <span
                                    className="block truncate"
                                    title={cell || undefined}
                                  >
                                    {cell || "—"}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <p className="px-4 py-8 text-center text-xs text-lf-muted">
                      No preview
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!canImport}
                className="w-full rounded-xl bg-lf-accent px-6 py-2.5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/20 transition hover:bg-lf-accent-deep disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {importPending ? importPendingLabel : importLabel}
              </button>
              <p className="text-center text-[11px] text-lf-subtle sm:text-left">
                Drag another file anywhere on the dashed border to replace.
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
