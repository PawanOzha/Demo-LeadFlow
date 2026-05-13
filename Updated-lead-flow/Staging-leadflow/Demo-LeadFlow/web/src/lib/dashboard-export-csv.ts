import type { DashboardExportPayload } from "./dashboard-export-types";

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(",");
}

export function exportFileBase(payload: DashboardExportPayload): string {
  const gen = payload.generatedAt;
  const ymd =
    typeof gen === "string" && gen.length >= 10
      ? gen.slice(0, 10)
      : (() => {
          try {
            const d = gen != null ? new Date(gen as string) : new Date();
            const t = d.getTime();
            return Number.isNaN(t) ? "unknown" : d.toISOString().slice(0, 10);
          } catch {
            return "unknown";
          }
        })();
  const raw = String(payload.rangeLabel ?? "all time");
  const slug = raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 48);
  const prefix = String(payload.fileNamePrefix ?? "export").trim() || "export";
  return `${prefix}-${slug || "all-time"}-${ymd}`;
}

export function buildDashboardCsv(payload: DashboardExportPayload): string {
  const lines: string[] = [];
  lines.push(csvRow([payload.title]));
  lines.push(csvRow(["Subtitle", payload.subtitle]));
  lines.push(csvRow(["Range", payload.rangeLabel]));
  lines.push(csvRow(["Generated (UTC)", payload.generatedAt]));
  lines.push("");
  lines.push(csvRow(["=== Summary ==="]));
  lines.push(csvRow(["Metric", "Value"]));
  for (const r of payload.summaryRows) {
    lines.push(csvRow([r.label, r.value]));
  }
  for (const t of payload.tables) {
    lines.push("");
    lines.push(csvRow([`=== ${t.title} ===`]));
    lines.push(csvRow(t.headers));
    for (const row of t.rows) {
      lines.push(csvRow(row));
    }
  }
  return lines.join("\n");
}
