import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { dbQuery } from "@/lib/db/pool";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  leadWhereSql,
  preservedSearchParamEntriesForDateBar,
  searchParamFirst,
} from "@/lib/analyst-date-range";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import type { PortalAnalystLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { AnalystAllLeadsTableClient } from "@/components/portal-leads/analyst-all-leads-table-client";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import { logLeadsAudit, timedServerBlock } from "@/lib/server/log";
import { coerceMoney } from "@/lib/deal-money";

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
  const perPage: 25 | 50 | 200 =
    perPageRaw === 50 || perPageRaw === 200 ? perPageRaw : 25;
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const { clause, params } = leadWhereSql(session.id, from, to, q);
  const selectColumns = `
    id,
    "leadName",
    phone,
    "leadEmail",
    source,
    notes,
    "lostNotes",
    "qualificationStatus",
    "leadScore",
    "salesStage",
    "createdAt",
    "estimatedDealValue",
    "closedRevenue",
    "dealCurrency"
  `;

  const [countRows, pagedLeads, exportLeads] = await timedServerBlock(
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
          estimatedDealValue: unknown;
          closedRevenue: unknown;
          dealCurrency: string;
        }>(
          `SELECT ${selectColumns} FROM "Lead" WHERE ${clause} ORDER BY "createdAt" DESC, id DESC LIMIT ($${params.length + 1})::bigint OFFSET ($${params.length + 2})::bigint`,
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
          qualificationStatus: string;
          leadScore: number | null;
          salesStage: string;
          createdAt: Date;
          estimatedDealValue: unknown;
          closedRevenue: unknown;
          dealCurrency: string;
        }>(
          `SELECT ${selectColumns} FROM "Lead" WHERE ${clause} ORDER BY "createdAt" DESC, id DESC LIMIT ($${params.length + 1})::bigint`,
          [...params, PORTAL_LEADS_EXPORT_ROW_CAP],
        ),
      ]),
  );
  const totalCount = Number(countRows[0]?.c ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (page > totalPages) {
    const qp = new URLSearchParams();
    if (from) qp.set("from", from);
    if (to) qp.set("to", to);
    if (q) qp.set("q", q);
    qp.set("perPage", String(perPage));
    qp.set("page", "1");
    redirect(`/analyst/leads?${qp.toString()}`);
  }
  const safePage = page;
  const leads = pagedLeads;
  logLeadsAudit("analyst-leads", {
    page,
    perPage,
    totalCount,
    hasSearch: Boolean(q),
    hasDateRange: Boolean(from && to),
  });

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
    estimatedDealValue: coerceMoney(l.estimatedDealValue),
    closedRevenue: coerceMoney(l.closedRevenue),
    dealCurrency: l.dealCurrency?.trim() || "USD",
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
      estimatedDealValue: coerceMoney(l.estimatedDealValue),
      closedRevenue: coerceMoney(l.closedRevenue),
      dealCurrency: l.dealCurrency?.trim() || "USD",
    }),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
        page={safePage}
        perPage={perPage}
        totalCount={totalCount}
      />

      <AnalystAllLeadsTableClient
        key={`${from ?? ""}|${to ?? ""}|${safePage}|${perPage}`}
        leads={rows}
        initialQ={q}
        from={from}
        to={to}
        rangeLabel={rangeLabel}
        exportLeads={analystExportLeads}
        rangeTotalCount={totalCount}
      />

      <PortalPaginationBar
        pathname="/analyst/leads"
        query={{
          from,
          to,
          q,
          ...(perPage !== 25 ? { perPage: String(perPage) } : {}),
        }}
        page={safePage}
        perPage={perPage}
        totalCount={totalCount}
      />
    </div>
  );
}
