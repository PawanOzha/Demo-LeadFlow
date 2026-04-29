import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db/pool";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  hrefWithDateRange,
  leadWhereSql,
  preservedSearchParamEntriesForDateBar,
  searchParamFirst,
} from "@/lib/analyst-date-range";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import type { PortalAnalystLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { AnalystAllLeadsTableClient } from "@/components/portal-leads/analyst-all-leads-table-client";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import { timedServerBlock } from "@/lib/server/log";

export default async function AnalystAllLeadsPage({
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
  const { clause, params } = leadWhereSql(session.id, from, to);

  const [countRows, leads, exportLeads] = await timedServerBlock(
    "route:/analyst/leads page:queries",
    () =>
      Promise.all([
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
          qualificationStatus: string;
          leadScore: number | null;
          salesStage: string;
          createdAt: Date;
        }>(
          `SELECT * FROM "Lead" WHERE ${clause} ORDER BY "createdAt" DESC LIMIT ($${params.length + 1})::int OFFSET ($${params.length + 2})::bigint`,
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
          qualificationStatus: string;
          leadScore: number | null;
          salesStage: string;
          createdAt: Date;
        }>(
          `SELECT * FROM "Lead" WHERE ${clause} ORDER BY "createdAt" DESC LIMIT $${params.length + 1}`,
          [...params, PORTAL_LEADS_EXPORT_ROW_CAP],
        ),
      ]),
  );
  const totalCount = Number(countRows[0]?.c ?? 0);

  const rows = leads.map((l) => ({
    id: l.id,
    leadName: l.leadName,
    phone: l.phone,
    leadEmail: l.leadEmail,
    source: l.source,
    notes: l.notes,
    lostNotes: l.lostNotes,
    qualificationStatus: l.qualificationStatus,
    leadScore: l.leadScore,
    salesStage: l.salesStage,
    createdAt: l.createdAt.toISOString(),
  }));

  const analystExportLeads: PortalAnalystLeadExportRow[] = exportLeads.map(
    (l) => ({
      leadName: l.leadName,
      phone: l.phone,
      leadEmail: l.leadEmail,
      source: l.source,
      notes: l.notes,
      lostNotes: l.lostNotes,
      qualificationStatus: l.qualificationStatus,
      leadScore: l.leadScore,
      salesStage: l.salesStage,
      createdAt: l.createdAt.toISOString(),
    }),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">
            All leads
          </h1>
          <p className="mt-1 text-[13px] font-normal text-gray-600">
            Every lead you have added ·{" "}
            <Link
              href={hrefWithDateRange("/analyst", null, null, q)}
              className="text-lf-link hover:underline"
            >
              Back to dashboard
            </Link>
            {" · "}
            <Link
              href="/analyst/leads/import"
              className="text-lf-link hover:underline"
            >
              Import from Excel
            </Link>
          </p>
        </div>
      </header>

      <AnalystDateRangeBar
        key={`${from ?? ""}|${to ?? ""}`}
        pathname="/analyst/leads"
        defaultFrom={from ?? ""}
        defaultTo={to ?? ""}
        preservedEntries={preservedEntries}
        rangeSummary={rangeLabel}
      />

      <PortalPaginationBar
        pathname="/analyst/leads"
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

      <AnalystAllLeadsTableClient
        key={`${from ?? ""}|${to ?? ""}|${page}|${perPage}`}
        leads={rows}
        initialQ={q}
        from={from}
        to={to}
        rangeLabel={rangeLabel}
        exportLeads={analystExportLeads}
        rangeTotalCount={totalCount}
        exportRowCount={exportLeads.length}
      />
    </div>
  );
}
