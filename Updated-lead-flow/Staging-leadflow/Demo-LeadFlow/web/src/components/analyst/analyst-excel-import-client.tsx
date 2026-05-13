"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { importLeadsFromExcelAnalyst } from "@/app/actions/leads-import-analyst";
import { ExcelDropPreviewZone } from "@/components/excel-drop-preview-zone";
import {
  ANALYST_IMPORT_COLUMN_META,
  ANALYST_IMPORT_SAMPLE_ROW,
  ANALYST_IMPORT_TEMPLATE_COLUMNS,
  type AnalystImportHeaderKey,
} from "@/lib/analyst-lead-import";
import { parseAnalystImportExcelForPreview } from "@/lib/analyst-import-preview";
import type { ExcelDropPreviewParseResult } from "@/components/excel-drop-preview-zone";
import { LEAD_SOURCE_OPTIONS } from "@/lib/lead-sources";
import { LEAD_WEBSITE_OPTIONS } from "@/lib/lead-websites";
import { QualificationStatus } from "@/lib/constants";

const ACCEPT =
  ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

function metaForImportKey(key: AnalystImportHeaderKey) {
  return ANALYST_IMPORT_COLUMN_META.find((c) => c.key === key);
}

/** Recommended template: leads_source carries the preset; lead_source column is optional override. */
function excelTemplateRequired(
  excelHeader: string,
  internalKey: AnalystImportHeaderKey,
): boolean {
  if (["full_name", "phone", "qualification"].includes(internalKey)) return true;
  if (internalKey === "lead_source" && excelHeader === "leads_source") return true;
  return false;
}

function downloadSampleTemplate() {
  const headerRow = ANALYST_IMPORT_TEMPLATE_COLUMNS.map((c) => c.header);
  const sampleRow = ANALYST_IMPORT_TEMPLATE_COLUMNS.map(
    (c) => ANALYST_IMPORT_SAMPLE_ROW[c.key],
  );
  const ws = XLSX.utils.aoa_to_sheet([headerRow, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.writeFile(wb, "leadflow-analyst-leads-import-sample.xlsx");
}

async function parseAnalystFileForZone(
  file: File,
): Promise<ExcelDropPreviewParseResult> {
  const r = await parseAnalystImportExcelForPreview(file);
  if (!r.ok) return r;
  const { headers, rows, dataRowCount, missingRequired } = r.data;
  const summaryParts = [
    `${dataRowCount} data row${dataRowCount === 1 ? "" : "s"}`,
    rows.length < dataRowCount ? `— showing first ${rows.length}` : "",
  ].filter(Boolean);
  return {
    ok: true,
    data: {
      headers,
      rows,
      summaryLine: summaryParts.join(" "),
      disableImport: missingRequired.length > 0,
      alerts:
        missingRequired.length > 0
          ? [
              `Missing required column(s): ${missingRequired.map((k) => `"${k}"`).join(", ")} — fix row 1 headers or use the sample download.`,
            ]
          : undefined,
    },
  };
}

export function AnalystExcelImportClient() {
  const router = useRouter();
  const [message, setMessage] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [rowErrors, setRowErrors] = useState<
    { row: number; message: string }[]
  >([]);

  const handleImport = useCallback(
    async (file: File): Promise<boolean> => {
      setMessage(null);
      setRowErrors([]);
      const formData = new FormData();
      formData.set("file", file);
      const result = await importLeadsFromExcelAnalyst(formData);
      if (!result.ok) {
        setMessage({ kind: "err", text: result.error });
        if (result.rowErrors?.length) setRowErrors(result.rowErrors);
        return false;
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
      router.refresh();
      return true;
    },
    [router],
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm shadow-black/8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-lf-subtle">
              Sample row (same as form)
            </h2>
            <p className="mt-1 text-xs text-lf-subtle">
              Lead source codes:{" "}
              {LEAD_SOURCE_OPTIONS.map((o) => o.value).join(", ")}.
              Qualification: {QualificationStatus.QUALIFIED},{" "}
              {QualificationStatus.NOT_QUALIFIED},{" "}
              {QualificationStatus.IRRELEVANT}.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="shrink-0 rounded-xl border border-lf-border px-4 py-2.5 text-sm font-medium text-lf-text-secondary transition hover:bg-lf-bg/50"
          >
            Download sample Excel
          </button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-lf-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-lf-border bg-lf-bg text-xs text-lf-muted">
                {ANALYST_IMPORT_TEMPLATE_COLUMNS.map((c, idx) => (
                  <th
                    key={`${c.header}-${idx}`}
                    className="whitespace-nowrap px-3 py-2 font-medium"
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-lf-text">
                {ANALYST_IMPORT_TEMPLATE_COLUMNS.map((c, idx) => {
                  const raw = ANALYST_IMPORT_SAMPLE_ROW[c.key];
                  const emptyAsDash =
                    (c.key === "source_other" || c.key === "date_added") &&
                    !String(raw).trim();
                  const display = emptyAsDash ? "—" : raw;
                  const mono =
                    c.key === "lead_source" ||
                    c.key === "phone" ||
                    c.key === "qualification";
                  return (
                    <td
                      key={`sample-${idx}`}
                      className={`whitespace-nowrap px-3 py-2.5 text-xs ${mono ? "font-mono" : ""} ${
                        c.key === "notes"
                          ? "max-w-[200px] text-lf-muted"
                          : ""
                      }`}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm shadow-black/8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lf-subtle">
          Upload
        </h2>
        <p className="mt-2 text-sm text-lf-muted">
          <strong className="text-lf-text">.xlsx</strong> or{" "}
          <strong className="text-lf-text">.xls</strong>,{" "}
          <strong className="text-lf-text">2 MB</strong> max. Drag onto the box
          below, browse, preview, then import. Row limits follow your server
          settings.
        </p>

        <ExcelDropPreviewZone
          className="mt-4"
          accept={ACCEPT}
          fileInputAriaLabel="Choose Excel file"
          parseFile={parseAnalystFileForZone}
          onImport={handleImport}
          importLabel="Import leads"
          importPendingLabel="Importing…"
          dropTitle="Drag and drop your Excel file here"
          dropHint="or use Browse — everything stays inside this box until you import"
          maxSizeHint="Maximum file size 2 MB"
        />

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

      <section className="rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-sm shadow-black/8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lf-subtle">
          Expected columns
        </h2>
        <p className="mt-2 text-sm text-lf-muted">
          Row 1 of your sheet should follow this header order — same as{" "}
          <strong className="text-lf-text">websites_name</strong>,{" "}
          <strong className="text-lf-text">leads_source</strong>, … through{" "}
          <strong className="text-lf-text">notes</strong> (you can use synonyms
          like <strong className="text-lf-text">portal_website</strong> for websites).{" "}
          <strong className="text-lf-text">source_other</strong> carries website /
          Meta detail like the Add Lead form ({LEAD_WEBSITE_OPTIONS.length}{" "}
          preset sites or free text).
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-lf-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-lf-border bg-lf-bg text-xs text-lf-muted">
                <th className="whitespace-nowrap px-3 py-2 font-medium">
                  Excel row 1 header
                </th>
                <th className="px-3 py-2 font-medium">Required</th>
                <th className="px-3 py-2 font-medium">Field</th>
              </tr>
            </thead>
            <tbody className="text-lf-text">
              {ANALYST_IMPORT_TEMPLATE_COLUMNS.map((col, idx) => {
                const meta = metaForImportKey(col.key);
                const req = excelTemplateRequired(col.header, col.key);
                const isSecondLeadSourceSlot =
                  col.header === "lead_source" && col.key === "lead_source";
                return (
                  <tr
                    key={`${col.header}-${idx}`}
                    className="border-b border-lf-border last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-lf-link">
                      {col.header}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {req ? (
                        <span className="text-lf-danger">Yes</span>
                      ) : (
                        <span className="text-lf-subtle">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-lf-muted">
                      <span className="text-lf-text-secondary">
                        {meta?.label ?? col.key}
                      </span>
                      {isSecondLeadSourceSlot ? (
                        <span className="mt-0.5 block text-lf-subtle">
                          Optional second slot; if filled, overrides leads_source.
                          Same preset codes ({LEAD_SOURCE_OPTIONS.map((o) => o.value).join(", ")}).
                        </span>
                      ) : meta?.hint ? (
                        <span className="mt-0.5 block text-lf-subtle">
                          {meta.hint}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
