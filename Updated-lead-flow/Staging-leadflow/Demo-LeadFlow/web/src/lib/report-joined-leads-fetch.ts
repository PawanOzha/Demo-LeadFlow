import { dbQuery } from "@/lib/db/pool";

/** Wide lead row with creator + assigned exec labels (reports / dashboards). */
export type ReportLeadDashRow = {
  id: string;
  leadName: string;
  source: string;
  sourceWebsiteName: string | null;
  sourceMetaProfileName: string | null;
  qualificationStatus: string;
  salesStage: string;
  leadScore: number | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  createdAt: Date;
  notes: string | null;
  lostNotes: string | null;
  createdById: string;
  assignedSalesExecId: string | null;
  cb_name: string | null;
  cb_email: string | null;
  se_name: string | null;
};

const ID_PAGE = 2500;
const ANY_CHUNK = 800;

const LEAD_DASH_COLUMNS = `
  l.id,
  l."leadName",
  l.source,
  l."sourceWebsiteName",
  l."sourceMetaProfileName",
  l."qualificationStatus",
  l."salesStage",
  l."leadScore",
  l.phone,
  l.country,
  l.city,
  l."createdAt",
  l.notes,
  l."lostNotes",
  l."createdById",
  l."assignedSalesExecId",
  cb.name AS cb_name,
  cb.email AS cb_email,
  se.name AS se_name
`;

/**
 * Loads all leads matching `whereClause` via id paging + chunked `ANY()` detail fetch.
 * Avoids one giant wide SELECT, which can return no rows through the Supabase SQL RPC.
 */
export async function fetchReportLeadDashRowsJoined(
  whereClause: string,
  params: unknown[],
  order: "asc" | "desc",
): Promise<ReportLeadDashRow[]> {
  const dir = order === "asc" ? "ASC" : "DESC";
  const out: ReportLeadDashRow[] = [];
  let offset = 0;
  while (true) {
    const limIdx = params.length + 1;
    const offIdx = params.length + 2;
    const idRows = await dbQuery<{ id: string }>(
      `SELECT l.id FROM "Lead" l WHERE ${whereClause} ORDER BY l."createdAt" ${dir}, l.id ${dir} LIMIT ($${limIdx})::bigint OFFSET ($${offIdx})::bigint`,
      [...params, ID_PAGE, offset],
    );
    if (idRows.length === 0) break;
    const ids = idRows.map((r) => r.id);
    for (let i = 0; i < ids.length; i += ANY_CHUNK) {
      const slice = ids.slice(i, i + ANY_CHUNK);
      const batch = await dbQuery<ReportLeadDashRow>(
        `SELECT ${LEAD_DASH_COLUMNS}
         FROM "Lead" l
         LEFT JOIN "User" cb ON cb.id = l."createdById"
         LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
         WHERE l.id = ANY($1::text[])`,
        [slice],
      );
      const orderMap = new Map(slice.map((id, idx) => [id, idx]));
      batch.sort(
        (a, b) =>
          (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
      );
      out.push(...batch);
    }
    offset += ID_PAGE;
    if (idRows.length < ID_PAGE) break;
  }
  return out;
}
