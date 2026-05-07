import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { dbQuery } from "@/lib/db/pool";
import {
  analystRangeSummaryLabel,
  analystRangeParams,
  searchParamFirst,
} from "@/lib/analyst-date-range";
import { normalizeClientSearchQuery } from "@/lib/lead-client-search";
import { mtlLeadSql } from "@/lib/mtl-leads";
import { MtlLeadsTableClient } from "@/components/portal-leads/mtl-leads-table-client";
import { UserRole } from "@/lib/constants";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import type { PortalMtlLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { logLeadsAudit } from "@/lib/server/log";

export default async function TeamLeadLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const { q } = await analystRangeParams(sp);
  const query = normalizeClientSearchQuery(q);
  const pageRaw = Number.parseInt(searchParamFirst(sp, "page") ?? "", 10);
  const perPageRaw = Number.parseInt(searchParamFirst(sp, "perPage") ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const perPage: 25 | 50 | 200 =
    perPageRaw === 50 || perPageRaw === 200 ? perPageRaw : 25;
  const rangeLabel = analystRangeSummaryLabel(null, null);
  const { clause, params } = mtlLeadSql(session.id, null, null, "l", query);

  const mtlSelect = `SELECT
       l.id,
       l."leadName",
       l.phone,
       l."leadEmail",
       l.source,
       l.notes,
       l."lostNotes",
       l."leadScore",
       l."salesStage",
       l."execDeadlineAt",
       l."assignedSalesExecId",
       cb.name AS cb_name,
       se.id AS se_id,
       se.name AS se_name
       FROM "Lead" l
       LEFT JOIN "User" cb ON cb.id = l."createdById"
       LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
       WHERE ${clause}
       ORDER BY l."createdAt" DESC, l.id DESC`;

  const [countRows, pagedLeadRows, exportLeadRows] = await Promise.all([
    dbQuery<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause}`,
      params,
    ),
    dbQuery<{
      id: string;
      leadName: string;
      phone: string | null;
      leadEmail: string | null;
      source: string;
      notes: string | null;
      lostNotes: string | null;
      leadScore: number | null;
      salesStage: string;
      execDeadlineAt: Date | null;
      assignedSalesExecId: string | null;
      cb_name: string | null;
      se_id: string | null;
      se_name: string | null;
    }>(
      `${mtlSelect}
       LIMIT ($${params.length + 1})::bigint OFFSET ($${params.length + 2})::bigint`,
      [...params, perPage, (page - 1) * perPage],
    ),
    dbQuery<{
      id: string;
      leadName: string;
      phone: string | null;
      leadEmail: string | null;
      source: string;
      notes: string | null;
      lostNotes: string | null;
      leadScore: number | null;
      salesStage: string;
      execDeadlineAt: Date | null;
      assignedSalesExecId: string | null;
      cb_name: string | null;
      se_id: string | null;
      se_name: string | null;
    }>(
      `${mtlSelect}
       LIMIT ($${params.length + 1})::bigint`,
      [...params, PORTAL_LEADS_EXPORT_ROW_CAP],
    ),
  ]);
  const totalCount = Number(countRows[0]?.c ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (page > totalPages) {
    const qp = new URLSearchParams();
    if (query) qp.set("q", query);
    qp.set("perPage", String(perPage));
    qp.set("page", "1");
    redirect(`/team-lead/leads?${qp.toString()}`);
  }
  const safePage = page;
  const leadRows = pagedLeadRows;
  logLeadsAudit("team-lead-leads", {
    page,
    perPage,
    totalCount,
    hasSearch: Boolean(query),
  });

  const execs =
    session.teamId == null
      ? []
      : await dbQuery<{ id: string; name: string }>(
          `SELECT id, name FROM "User" WHERE "teamId" = $1 AND role = $2 ORDER BY name ASC`,
          [session.teamId, UserRole.SALES_EXECUTIVE],
        );

  const rows = leadRows.map((l) => ({
    id: l.id,
    leadName: l.leadName,
    phone: l.phone,
    leadEmail: l.leadEmail,
    source: l.source,
    notes: l.notes,
    lostNotes: l.lostNotes,
    leadScore: l.leadScore,
    salesStage: l.salesStage,
    execDeadlineAt: l.execDeadlineAt?.toISOString() ?? null,
    assignedSalesExecId: l.assignedSalesExecId,
    createdBy: { name: l.cb_name ?? "Unknown analyst" },
    assignedSalesExec:
      l.se_id && l.se_name
        ? { id: l.se_id, name: l.se_name }
        : null,
  }));

  const execOptions = execs.map((e) => ({ id: e.id, name: e.name }));

  const mtlExportLeads: PortalMtlLeadExportRow[] = exportLeadRows.map((l) => ({
    leadName: l.leadName,
    phone: l.phone,
    leadEmail: l.leadEmail,
    source: l.source,
    notes: l.notes,
    lostNotes: l.lostNotes,
    leadScore: l.leadScore,
    salesStage: l.salesStage,
    execDeadlineAt: l.execDeadlineAt?.toISOString() ?? null,
    analystName: l.cb_name ?? "Unknown analyst",
    repName:
      l.se_id && l.se_name ? l.se_name : null,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PortalPaginationBar
        pathname="/team-lead/leads"
        query={{
          q: query,
          ...(perPage !== 25 ? { perPage: String(perPage) } : {}),
        }}
        page={safePage}
        perPage={perPage}
        totalCount={totalCount}
      />

      <MtlLeadsTableClient
        key={`${safePage}|${perPage}`}
        leads={rows}
        initialQ={query}
        execs={execOptions}
        rangeLabel={rangeLabel}
        exportLeads={mtlExportLeads}
        rangeTotalCount={totalCount}
      />

      <PortalPaginationBar
        pathname="/team-lead/leads"
        query={{
          q: query,
          ...(perPage !== 25 ? { perPage: String(perPage) } : {}),
        }}
        page={safePage}
        perPage={perPage}
        totalCount={totalCount}
      />
    </div>
  );
}
