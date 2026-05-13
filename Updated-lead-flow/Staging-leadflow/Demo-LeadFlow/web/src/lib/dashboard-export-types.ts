export type DashboardExportTable = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
};

export type DashboardExportPayload = {
  title: string;
  subtitle: string;
  rangeLabel: string;
  generatedAt: string;
  fileNamePrefix: string;
  summaryRows: { label: string; value: string | number }[];
  tables: DashboardExportTable[];
};

/**
 * Ensures the export payload is JSON-serializable for React Flight (client
 * component props). BigInt from SQL drivers becomes number; other values pass through.
 */
export function toRscSerializableDashboardExport(
  payload: DashboardExportPayload,
): DashboardExportPayload {
  const replacer = (_key: string, value: unknown) =>
    typeof value === "bigint" ? Number(value) : value;
  try {
    return JSON.parse(
      JSON.stringify(payload, replacer),
    ) as DashboardExportPayload;
  } catch {
    return payload;
  }
}
