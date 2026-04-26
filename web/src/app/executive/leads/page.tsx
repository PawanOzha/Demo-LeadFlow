import { getSession } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db/pool";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  preservedSearchParamEntriesForDateBar,
  searchParamFirst,
} from "@/lib/analyst-date-range";
import { execLeadSql } from "@/lib/exec-leads";
import { ExecLeadsTableClient } from "@/components/portal-leads/exec-leads-table-client";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import type { PortalExecLeadExportRow } from "@/lib/portal-all-leads-export-payloads";

export default async function ExecutiveLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const [preservedEntries, { from, to, q }] = await Promise.all([
    preservedSearchParamEntriesForDateBar(sp),
    analystRangeParams(sp),
  ]);
  const pageRaw = Number.parseInt(searchParamFirst(sp, "page") ?? "", 10);
  const perPageRaw = Number.parseInt(searchParamFirst(sp, "perPage") ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const perPage: 25 | 50 | 100 =
    perPageRaw === 50 || perPageRaw === 100 ? perPageRaw : 25;
  const offset = (page - 1) * perPage;
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const { clause, params } = execLeadSql(session.id, from, to);

  const execSelect = `SELECT l.*, cb.name AS cb_name
       FROM "Lead" l
       JOIN "User" cb ON cb.id = l."createdById"
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
      createdAt: Date;
      cb_name: string;
    }>(
      `${execSelect}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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
      createdAt: Date;
      cb_name: string;
    }>(
      `${execSelect}
       LIMIT $${params.length + 1}`,
      [...params, PORTAL_LEADS_EXPORT_ROW_CAP],
    ),
  ]);
  const totalCount = Number(countRows[0]?.c ?? 0);

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
    createdBy: { name: l.cb_name },
  }));

  const execExportLeads: PortalExecLeadExportRow[] = exportLeadRows.map(
    (l) => ({
      leadName: l.leadName,
      phone: l.phone,
      leadEmail: l.leadEmail,
      source: l.source,
      notes: l.notes,
      lostNotes: l.lostNotes,
      leadScore: l.leadScore,
      salesStage: l.salesStage,
      execDeadlineAt: l.execDeadlineAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      analystName: l.cb_name,
    }),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-lf-text md:text-3xl">
          My leads
        </h1>
        <p className="mt-1 text-sm text-lf-muted">
          Leads assigned to you · {rangeLabel}
        </p>
      </header>

      <AnalystDateRangeBar
        key={`${from ?? ""}|${to ?? ""}`}
        pathname="/executive/leads"
        defaultFrom={from ?? ""}
        defaultTo={to ?? ""}
        preservedEntries={preservedEntries}
        rangeSummary={rangeLabel}
      />

      <PortalPaginationBar
        pathname="/executive/leads"
        query={{
          from,
          to,
          q,
          ...(perPage !== 25 ? { perPage: String(perPage) } : {}),
        }}
        page={page}
        perPage={perPage}
        totalCount={totalCount}
      />

      <ExecLeadsTableClient
        key={`${from ?? ""}|${to ?? ""}|${page}|${perPage}`}
        leads={rows}
        initialQ={q}
        rangeLabel={rangeLabel}
        exportLeads={execExportLeads}
        rangeTotalCount={totalCount}
        exportRowCount={exportLeadRows.length}
      />
    </div>
  );
}
