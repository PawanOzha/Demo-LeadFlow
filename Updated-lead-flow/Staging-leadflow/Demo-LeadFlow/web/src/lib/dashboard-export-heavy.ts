/**
 * PDF + XLSX export — loaded only on demand (dynamic import) so jspdf/xlsx
 * are not evaluated during SSR of dashboard pages (avoids env-specific crashes).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { DashboardExportPayload, DashboardExportTable } from "./dashboard-export-types";

function sanitizeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[\\/?*[\]]/g, "").trim().slice(0, 31);
  return cleaned || `Sheet${index + 1}`;
}

export function buildDashboardXlsx(payload: DashboardExportPayload): Blob {
  const wb = XLSX.utils.book_new();

  const summaryAoA: (string | number)[][] = [
    [payload.title],
    [payload.subtitle],
    [`Range: ${payload.rangeLabel}`],
    [`Generated: ${payload.generatedAt}`],
    [],
    ["Metric", "Value"],
    ...payload.summaryRows.map((r) => [
      r.label,
      typeof r.value === "number" && !Number.isFinite(r.value)
        ? "—"
        : r.value,
    ]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoA);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  payload.tables.forEach((t, i) => {
    const aoa = [t.headers, ...t.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const name = sanitizeSheetName(`${i + 1}. ${t.title}`, i);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

type DocWithTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

function tableBodyOrPlaceholder(t: DashboardExportTable): string[][] {
  if (t.rows.length === 0) {
    return [
      t.headers.map((_, i) =>
        i === 0 ? "No data in range" : "—",
      ),
    ];
  }
  return t.rows.map((row) => row.map((c) => String(c)));
}

export function buildDashboardPdf(payload: DashboardExportPayload): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = 16;

  doc.setFontSize(16);
  doc.text(payload.title, margin, y);
  y += 7;
  doc.setFontSize(10);
  const sub = `${payload.subtitle} · ${payload.rangeLabel}`;
  const subLines = doc.splitTextToSize(sub, 180);
  doc.text(subLines, margin, y);
  y += subLines.length * 5 + 4;
  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date(payload.generatedAt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })}`,
    margin,
    y,
  );
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: payload.summaryRows.map((r) => [r.label, String(r.value)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 23, 31] },
    margin: { left: margin, right: margin },
  });

  y = (doc as DocWithTable).lastAutoTable?.finalY ?? y;
  y += 10;

  for (const t of payload.tables) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(11);
    const titleLines = doc.splitTextToSize(t.title, 180);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 5 + 4;

    const fontSize = t.headers.length > 5 ? 7 : t.headers.length > 4 ? 8 : 9;
    autoTable(doc, {
      startY: y,
      head: [t.headers],
      body: tableBodyOrPlaceholder(t),
      styles: { fontSize, cellPadding: 1.5 },
      headStyles: { fillColor: [20, 23, 31] },
      margin: { left: margin, right: margin },
    });
    y = (doc as DocWithTable).lastAutoTable?.finalY ?? y;
    y += 10;
  }

  return doc.output("blob");
}
