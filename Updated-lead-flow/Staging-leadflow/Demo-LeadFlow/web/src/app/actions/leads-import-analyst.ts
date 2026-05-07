"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { newId, withTransaction } from "@/lib/db/pool";
import { getSession } from "@/lib/auth/session";
import {
  LeadHandoffAction,
  SalesStage,
  UserRole,
} from "@/lib/constants";
import { countryNameFromPhone } from "@/lib/phone-location";
import { isValidPhoneNumber } from "libphonenumber-js";
import type { LeadSourceValue } from "@/lib/lead-sources";
import {
  buildStoredSource,
  parseAnalystImportRow,
  resolveImportHeaderKey,
  type AnalystImportHeaderKey,
  type ParsedImportRow,
} from "@/lib/analyst-lead-import";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = Math.min(
  Number(process.env.EXCEL_MAX_ROWS) || 1000,
  5000,
);

export type ImportLeadsResult =
  | {
      ok: true;
      created: number;
      skippedEmpty: number;
      failedRows: number;
      rowErrors: { row: number; message: string }[];
    }
  | {
      ok: false;
      error: string;
      rowErrors?: { row: number; message: string }[];
    };

export async function importLeadsFromExcelAnalyst(
  formData: FormData,
): Promise<ImportLeadsResult> {
  const session = await getSession();
  if (!session || session.role !== UserRole.LEAD_ANALYST) {
    return { ok: false, error: "Unauthorized." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose an Excel file (.xlsx or .xls)." };
  }
  if (!file.size) {
    return { ok: false, error: "The file is empty." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: "File too large. Maximum allowed size is 2MB.",
    };
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return { ok: false, error: "Use a .xlsx or .xls file." };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return {
      ok: false,
      error: "File too large. Maximum allowed size is 2MB.",
    };
  }
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buf, {
      type: "buffer",
      sheetStubs: false,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellDates: true,
    });
  } catch (e) {
    console.error("XLSX parse error:", e);
    return {
      ok: false,
      error: "Failed to parse file. Please check the format and try again.",
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: false, error: "The workbook has no sheets." };
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (!matrix.length) {
    return { ok: false, error: "No rows found." };
  }

  const headerRow = (matrix[0] ?? []).map((c) => String(c ?? "").trim());
  const colKeys = headerRow.map((cell) => resolveImportHeaderKey(cell));
  const keySet = new Set(
    colKeys.filter((k): k is AnalystImportHeaderKey => k !== null),
  );

  const required: AnalystImportHeaderKey[] = [
    "full_name",
    "phone",
    "lead_source",
    "qualification",
  ];
  for (const r of required) {
    if (!keySet.has(r)) {
      return {
        ok: false,
        error: `Missing required column: "${r}". Copy the header row from the Import page sample.`,
      };
    }
  }

  const rowErrors: { row: number; message: string }[] = [];
  const parsedRows: ParsedImportRow[] = [];

  let skippedEmpty = 0;

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const obj: Partial<Record<AnalystImportHeaderKey, string>> = {};
    for (let j = 0; j < colKeys.length; j++) {
      const key = colKeys[j];
      if (!key) continue;
      obj[key] = String(line[j] ?? "").trim();
    }

    const allEmpty = Object.values(obj).every((v) => !String(v).trim());
    if (allEmpty) {
      skippedEmpty++;
      continue;
    }

    const excelRow = i + 1;
    const result = parseAnalystImportRow(excelRow, obj);
    if (!result.ok) {
      rowErrors.push({ row: result.rowNumber, message: result.error });
      continue;
    }
    if (!isValidPhoneNumber(result.row.phone)) {
      rowErrors.push({
        row: result.row.rowNumber,
        message:
          "Enter a valid phone number with country code (same rules as Add Lead).",
      });
      continue;
    }
    parsedRows.push(result.row);
  }

  if (parsedRows.length > MAX_ROWS) {
    return {
      ok: false,
      error: `Too many data rows (${parsedRows.length}). Maximum is ${MAX_ROWS} per upload.`,
    };
  }

  if (parsedRows.length === 0) {
    return {
      ok: false,
      error: "No valid rows to import.",
      rowErrors: rowErrors.slice(0, 50),
    };
  }

  const actorName = session.name ?? session.email;

  let created = 0;
  await withTransaction(async (c) => {
    for (const row of parsedRows) {
      const source = buildStoredSource(
        row.lead_source as LeadSourceValue,
        row.source_other,
      );
      const country = countryNameFromPhone(row.phone) ?? "Unknown";

      const leadId = newId();
      const createdAt = row.date_added ?? new Date();

      await c.query(
        `INSERT INTO "Lead" (
          id, "leadName", phone, "leadEmail", country, city, source, notes, "qualificationStatus", "leadScore",
          "salesStage", "createdById", "createdAt", "updatedAt", "internalReassignCount"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, CURRENT_TIMESTAMP, 0
        )`,
        [
          leadId,
          row.full_name,
          row.phone,
          row.email,
          country,
          row.city,
          source,
          row.notes,
          row.qualification,
          row.lead_score,
          SalesStage.PRE_SALES,
          session.id,
          createdAt,
        ],
      );

      const logId = newId();
      await c.query(
        `INSERT INTO "LeadHandoffLog" (id, "leadId", action, "actorId", detail)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          logId,
          leadId,
          LeadHandoffAction.LEAD_CREATED,
          session.id,
          `Created by ${actorName} (Excel import)`,
        ],
      );
      created++;
    }
  });

  revalidatePath("/analyst", "layout");
  revalidatePath("/analyst-team-lead", "layout");
  revalidatePath("/superadmin");

  return {
    ok: true,
    created,
    skippedEmpty,
    failedRows: rowErrors.length,
    rowErrors: rowErrors.slice(0, 50),
  };
}
