import { dbQuery, rpcJsonParamTextArrayUnpack } from "@/lib/db/pool";
import { SQL_RPC_SAFE_PAGE_SIZE } from "@/lib/db/sql-rpc-page-size";

/** Row shape for ATL “all leads” table + export (matches analyst-team-lead/leads SELECT). */
export type AtlJoinedLeadRow = {
  id: string;
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  source: string;
  portalWebsite: string | null;
  notes: string | null;
  lostNotes: string | null;
  qualificationStatus: string;
  leadScore: number | null;
  salesStage: string;
  createdAt: Date;
  teamId: string | null;
  assignedMainTeamLeadId: string | null;
  cb_id: string | null;
  cb_name: string | null;
  cb_image: string | null;
  mtl_id: string | null;
  team_name: string | null;
  mtl_name: string | null;
  mtl_image: string | null;
  se_id: string | null;
  se_name: string | null;
  se_image: string | null;
};

const ATL_LEAD_DETAIL_SELECT = `
           l.id,
           l."leadName",
           l.phone,
           l."leadEmail",
           l.source,
           l."portalWebsite",
           l.notes,
           l."lostNotes",
           l."qualificationStatus",
           l."leadScore",
           l."salesStage",
           l."createdAt",
           l."teamId",
           l."assignedMainTeamLeadId",
           cb.id AS cb_id,
           cb.name AS cb_name,
           cb.image AS cb_image,
           tm.name AS team_name,
           mtl.id AS mtl_id,
           mtl.name AS mtl_name,
           mtl.image AS mtl_image,
           se.id AS se_id,
           se.name AS se_name,
           se.image AS se_image`;

const ATL_LEAD_FROM = `
           FROM "Lead" l
           LEFT JOIN "User" cb ON cb.id = l."createdById"
           LEFT JOIN "Team" tm ON tm.id = l."teamId"
           LEFT JOIN "User" mtl ON mtl.id = l."assignedMainTeamLeadId"
           LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"`;

/**
 * One narrow id page (ORDER BY matches list + export). Safe through SQL RPC
 * where a single wide JOIN + LIMIT can return no rows.
 */
export async function fetchAtlLeadIdsOrdered(
  whereClause: string,
  baseParams: unknown[],
  limit: number,
  offset: number,
): Promise<string[]> {
  const limIdx = baseParams.length + 1;
  const offIdx = baseParams.length + 2;
  const rows = await dbQuery<{ id: string }>(
    `SELECT l.id FROM "Lead" l WHERE ${whereClause} ORDER BY l."createdAt" DESC, l.id DESC LIMIT ($${limIdx})::bigint OFFSET ($${offIdx})::bigint`,
    [...baseParams, limit, offset],
  );
  return rows.map((r) => r.id);
}

/** Hydrate joined rows for a bounded id list (chunked for RPC row caps). */
export async function fetchAtlJoinedRowsByIds(
  ids: string[],
): Promise<AtlJoinedLeadRow[]> {
  if (ids.length === 0) return [];
  const out: AtlJoinedLeadRow[] = [];
  for (let i = 0; i < ids.length; i += SQL_RPC_SAFE_PAGE_SIZE) {
    const slice = ids.slice(i, i + SQL_RPC_SAFE_PAGE_SIZE);
    const rows = await dbQuery<AtlJoinedLeadRow>(
      `SELECT ${ATL_LEAD_DETAIL_SELECT} ${ATL_LEAD_FROM} WHERE l.id = ANY(${rpcJsonParamTextArrayUnpack(1)})`,
      [slice],
    );
    const order = new Map(slice.map((id, idx) => [id, idx]));
    rows.sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
    out.push(...rows);
  }
  return out;
}

export async function fetchAtlLeadsListPage(
  whereClause: string,
  baseParams: unknown[],
  limit: number,
  offset: number,
): Promise<AtlJoinedLeadRow[]> {
  const ids = await fetchAtlLeadIdsOrdered(
    whereClause,
    baseParams,
    limit,
    offset,
  );
  return fetchAtlJoinedRowsByIds(ids);
}

/** Ordered export scan up to maxRows (id pages then hydrate). */
export async function fetchAtlLeadsExportRows(
  whereClause: string,
  baseParams: unknown[],
  maxRows: number,
): Promise<AtlJoinedLeadRow[]> {
  const out: AtlJoinedLeadRow[] = [];
  let offset = 0;
  while (out.length < maxRows) {
    const take = Math.min(SQL_RPC_SAFE_PAGE_SIZE, maxRows - out.length);
    const ids = await fetchAtlLeadIdsOrdered(
      whereClause,
      baseParams,
      take,
      offset,
    );
    if (ids.length === 0) break;
    const rows = await fetchAtlJoinedRowsByIds(ids);
    out.push(...rows);
    offset += ids.length;
    if (ids.length < take) break;
  }
  return out;
}
