"use client";

import { useCallback, useState, type FormEvent } from "react";
import * as XLSX from "xlsx";
import { importLeadsFromExcelAnalyst } from "@/app/actions/leads-import-analyst";
import {
  ANALYST_IMPORT_COLUMN_META,
  ANALYST_IMPORT_HEADER_KEYS,
  ANALYST_IMPORT_SAMPLE_ROW,
} from "@/lib/analyst-lead-import";
import { LEAD_SOURCE_OPTIONS } from "@/lib/lead-sources";
import { QualificationStatus } from "@/lib/constants";

function downloadSampleTemplate() {
  const headerRow = [...ANALYST_IMPORT_HEADER_KEYS];
  const sampleRow = ANALYST_IMPORT_HEADER_KEYS.map(
    (k) => ANALYST_IMPORT_SAMPLE_ROW[k],
  );
  const ws = XLSX.utils.aoa_to_sheet([headerRow, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.writeFile(wb, "leadflow-analyst-leads-import-sample.xlsx");
}

export function AnalystExcelImportClient() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [rowErrors, setRowErrors] = useState<
    { row: number; message: string }[]
  >([]);

  const onSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    setMessage(null);
    setRowErrors([]);
    try {
      const result = await importLeadsFromExcelAnalyst(formData);
      if (!result.ok) {
        setMessage({ kind: "err", text: result.error });
        if (result.rowErrors?.length) setRowErrors(result.rowErrors);
        return;
      }
      const parts = [
        `Imported ${result.created} lead${result.created === 1 ? "" : "s"}.`,
      ];
      if (result.skippedEmpty)
        parts.push(`${result.skippedEmpty} blank row(s) skipped.`);
      if (result.failedRows)
        parts.push(
          `${result.failedRows} row(s) had errors and were not imported.`,
        );
      setMessage({ kind: "ok", text: parts.join(" ") });
      if (result.rowErrors.length) setRowErrors(result.rowErrors);
      form.reset();
    } finally {
      setPending(false);
    }
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm shadow-black/8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lf-subtle">
          Expected columns
        </h2>
        <p className="mt-2 text-sm text-lf-muted">
          Row 1 of your sheet must use these headers (copy from the sample
          download or the table below). Values match the{" "}
          <strong className="text-lf-text">Add new lead</strong> form.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-lf-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-lf-border bg-lf-bg text-xs text-lf-muted">
                <th className="px-3 py-2 font-medium">Column (Excel row 1)</th>
                <th className="px-3 py-2 font-medium">Required</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="text-lf-text">
              {ANALYST_IMPORT_COLUMN_META.map((col) => (
                <tr
                  key={col.key}
                  className="border-b border-lf-border last:border-0"
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-lf-link">
                    {col.key}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {col.required ? (
                      <span className="text-lf-danger">Yes</span>
                    ) : (
                      <span className="text-lf-subtle">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-lf-muted">
                    <span className="text-lf-text-secondary">{col.label}</span>
                    {col.hint ? (
                      <span className="mt-0.5 block text-lf-subtle">
                        {col.hint}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm shadow-black/8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lf-subtle">
          Sample row (same as form)
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-lf-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-lf-border bg-lf-bg text-xs text-lf-muted">
                {ANALYST_IMPORT_COLUMN_META.map((c) => (
                  <th key={c.key} className="px-3 py-2 font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-lf-text">
                <td className="px-3 py-2.5 text-xs">{ANALYST_IMPORT_SAMPLE_ROW.full_name}</td>
                <td className="px-3 py-2.5 font-mono text-xs">
                  {ANALYST_IMPORT_SAMPLE_ROW.phone}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {ANALYST_IMPORT_SAMPLE_ROW.email}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {ANALYST_IMPORT_SAMPLE_ROW.city}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">
                  {ANALYST_IMPORT_SAMPLE_ROW.lead_source}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {ANALYST_IMPORT_SAMPLE_ROW.source_other || "—"}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">
                  {ANALYST_IMPORT_SAMPLE_ROW.qualification}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {ANALYST_IMPORT_SAMPLE_ROW.lead_score}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {ANALYST_IMPORT_SAMPLE_ROW.date_added || "—"}
                </td>
                <td className="max-w-[200px] px-3 py-2.5 text-xs text-lf-muted">
                  {ANALYST_IMPORT_SAMPLE_ROW.notes}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-lf-subtle">
          Lead source codes:{" "}
          {LEAD_SOURCE_OPTIONS.map((o) => o.value).join(", ")}. Qualification:{" "}
          {QualificationStatus.QUALIFIED}, {QualificationStatus.NOT_QUALIFIED},{" "}
          {QualificationStatus.IRRELEVANT}.
        </p>
      </section>

      <section className="rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm shadow-black/8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lf-subtle">
          Upload
        </h2>
        <p className="mt-2 text-sm text-lf-muted">
          .xlsx or .xls, up to 5 MB and 500 data rows. Blank rows are skipped.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="rounded-xl border border-lf-border px-4 py-2.5 text-sm font-medium text-lf-text-secondary transition hover:bg-lf-bg/50"
          >
            Download sample Excel
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="flex max-w-lg flex-col gap-2">
            <span className="text-xs font-medium text-lf-muted">
              Excel file
            </span>
            <input
              name="file"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              required
              disabled={pending}
              className="text-sm text-lf-text file:mr-3 file:rounded-lg file:border-0 file:bg-lf-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-lf-on-accent hover:file:bg-lf-accent-deep disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-lf-accent px-6 py-2.5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/20 transition hover:bg-lf-accent-deep disabled:opacity-50"
          >
            {pending ? "Importing…" : "Import leads"}
          </button>
        </form>

        {message ? (
          <p
            className={`mt-4 text-sm ${message.kind === "ok" ? "text-lf-success" : "text-lf-danger"}`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}

        {rowErrors.length > 0 ? (
          <div className="mt-4 rounded-xl border border-lf-warning/30 bg-lf-warning/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-lf-warning">
              Row issues (up to 50)
            </p>
            <ul className="mt-2 max-h-48 list-inside list-disc space-y-1 overflow-y-auto text-xs text-lf-text-secondary">
              {rowErrors.map((e) => (
                <li key={`${e.row}-${e.message}`}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
