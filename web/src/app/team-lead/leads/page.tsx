import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db/pool";
import {
  analystRangeSummaryLabel,
  searchParamFirst,
} from "@/lib/analyst-date-range";
import { normalizeClientSearchQuery } from "@/lib/lead-client-search";
import { mtlLeadSql } from "@/lib/mtl-leads";
import { MtlLeadsTableClient } from "@/components/portal-leads/mtl-leads-table-client";
import { UserRole } from "@/lib/constants";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import type { PortalMtlLeadExportRow } from "@/lib/portal-all-leads-export-payloads";

export default async function TeamLeadLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const q = normalizeClientSearchQuery(searchParamFirst(sp, "q"));
  const pageRaw = Number.parseInt(searchParamFirst(sp, "page") ?? "", 10);
  const perPageRaw = Number.parseInt(searchParamFirst(sp, "perPage") ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const perPage: 25 | 50 | 100 =
    perPageRaw === 50 || perPageRaw === 100 ? perPageRaw : 25;
  const offset = (page - 1) * perPage;
  const rangeLabel = analystRangeSummaryLabel(null, null);
  const { clause, params } = mtlLeadSql(session.id, null, null);

  const mtlSelect = `SELECT l.*, cb.name AS cb_name, se.id AS se_id, se.name AS se_name
       FROM "Lead" l
       JOIN "User" cb ON cb.id = l."createdById"
       LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
       WHERE ${clause}
       ORDER BY l."createdAt" DESC`;

  const [countRows, leadRows, exportLeadRows] = await Promise.all([
    dbQuery<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "Lead" WHERE ${clause}`,
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
      cb_name: string;
      se_id: string | null;
      se_name: string | null;
    }>(
      `${mtlSelect}
       LIMIT ($${params.length + 1})::bigint OFFSET ($${params.length + 2})::bigint`,
      [...params, perPage, offset],
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
      cb_name: string;
      se_id: string | null;
      se_name: string | null;
    }>(
      `${mtlSelect}
       LIMIT ($${params.length + 1})::bigint`,
      [...params, PORTAL_LEADS_EXPORT_ROW_CAP],
    ),
  ]);
  const totalCount = Number(countRows[0]?.c ?? 0);

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
    createdBy: { name: l.cb_name },
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
    analystName: l.cb_name,
    repName:
      l.se_id && l.se_name ? l.se_name : null,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        
      </header>

      <PortalPaginationBar
        pathname="/team-lead/leads"
        query={{
          q,
          ...(perPage !== 25 ? { perPage: String(perPage) } : {}),
        }}
        page={page}
        perPage={perPage}
        totalCount={totalCount}
      />

      <MtlLeadsTableClient
        key={`${page}|${perPage}`}
        leads={rows}
        initialQ={q}
        execs={execOptions}
        rangeLabel={rangeLabel}
        exportLeads={mtlExportLeads}
        rangeTotalCount={totalCount}
        exportRowCount={exportLeadRows.length}
      />
    </div>
  );
}
