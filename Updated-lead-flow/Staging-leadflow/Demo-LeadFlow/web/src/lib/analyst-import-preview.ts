import * as XLSX from "xlsx";
import {
  resolveImportHeaderKey,
  type AnalystImportHeaderKey,
} from "@/lib/analyst-lead-import";

export const ANALYST_IMPORT_PREVIEW_MAX_BYTES = 2 * 1024 * 1024;
export const ANALYST_IMPORT_PREVIEW_ROW_CAP = 10;

const REQUIRED_IMPORT_KEYS: AnalystImportHeaderKey[] = [
  "full_name",
  "phone",
  "lead_source",
  "qualification",
];

export type AnalystImportPreviewData = {
  headers: string[];
  rows: string[][];
  dataRowCount: number;
  missingRequired: AnalystImportHeaderKey[];
};

export type AnalystImportPreviewResult =
  | { ok: true; data: AnalystImportPreviewData }
  | { ok: false; error: string };

/** Client-side first-sheet preview for analyst Excel import (same rules as server). */
export async function parseAnalystImportExcelForPreview(
  file: File,
): Promise<AnalystImportPreviewResult> {
  if (!file.size) {
    return { ok: false, error: "This file is empty." };
  }
  if (file.size > ANALYST_IMPORT_PREVIEW_MAX_BYTES) {
    return {
      ok: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Max is 2 MB.`,
    };
  }
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    return { ok: false, error: "Use a .xlsx or .xls file." };
  }

  let workbook: XLSX.WorkBook;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    workbook = XLSX.read(data, {
      type: "array",
      sheetStubs: false,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellDates: true,
    });
  } catch {
    return {
      ok: false,
      error:
        "Could not read this Excel file. Try re-saving as .xlsx from Excel.",
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: false, error: "This workbook has no sheets." };
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (!matrix.length) {
    return { ok: false, error: "No rows found in the first sheet." };
  }

  const headerRow = (matrix[0] ?? []).map((c) => String(c ?? "").trim());
  const colKeys = headerRow.map((cell) => resolveImportHeaderKey(cell));
  const keySet = new Set(
    colKeys.filter((k): k is AnalystImportHeaderKey => k !== null),
  );
  const missingRequired = REQUIRED_IMPORT_KEYS.filter((k) => !keySet.has(k));

  const width = Math.max(headerRow.length, 1);
  const pad = (line: unknown[]) => {
    const out = (line ?? []).map((c) => String(c ?? "").trim());
    while (out.length < width) out.push("");
    return out.slice(0, width);
  };

  const dataRows = matrix.slice(1);
  const previewLines = dataRows.slice(0, ANALYST_IMPORT_PREVIEW_ROW_CAP);
  const rows = previewLines.map((line) => pad(line));

  return {
    ok: true,
    data: {
      headers: pad(headerRow.map((h) => String(h))),
      rows,
      dataRowCount: dataRows.length,
      missingRequired,
    },
  };
}
