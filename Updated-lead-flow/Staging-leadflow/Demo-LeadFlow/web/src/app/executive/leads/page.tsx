import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { dbQuery } from "@/lib/db/pool";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import { PortalDashboardSearchBar } from "@/components/portal-dashboard-search-bar";
import { PortalDashboardSqlFiltersBar } from "@/components/portal-dashboard-sql-filters-bar";
import {
  PortalDashboardTopPanel,
  PortalDashboardTopPanelDateRow,
} from "@/components/portal-dashboard-top-panel";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  preservedSearchParamEntriesForDateBar,
  searchParamFirst,
} from "@/lib/analyst-date-range";
import { execLeadSql } from "@/lib/exec-leads";
import { mergedPortalLeadFilters } from "@/lib/server/leads/filter-parser";
import { exportScopeFromLeadFilters } from "@/lib/portal-export-scope";
import {
  PORTAL_LEAD_SOURCE_FILTER_OPTIONS,
  PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS,
} from "@/lib/portal-lead-filter-options";
import { ExecLeadsTableClient } from "@/components/portal-leads/exec-leads-table-client";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import type { PortalExecLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { coerceMoney } from "@/lib/deal-money";
import { logLeadsAudit } from "@/lib/server/log";

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
  const filters = mergedPortalLeadFilters(sp, { from, to, q });
  const pageRaw = Number.parseInt(searchParamFirst(sp, "page") ?? "", 10);
  const perPageRaw = Number.parseInt(searchParamFirst(sp, "perPage") ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const perPage: 25 | 50 | 200 =
    perPageRaw === 50 || perPageRaw === 200 ? perPageRaw : 25;
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const { clause, params } = execLeadSql(session.id, filters);
  const sourceOptions = PORTAL_LEAD_SOURCE_FILTER_OPTIONS;
  const websiteOptions = PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS;

  const execSelect = `SELECT
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
       l."createdAt",
       l."estimatedDealValue",
       l."closedRevenue",
       l."dealCurrency",
       l."createdById",
       COALESCE(cb.id, l."createdById") AS cb_id,
       cb.name AS cb_name,
       cb.image AS cb_image
       FROM "Lead" l
       LEFT JOIN "User" cb ON cb.id = l."createdById"
       WHERE ${clause}
       ORDER BY l."createdAt" DESC, l.id DESC`;

  // COUNT must complete before list/export queries: parallel `exec_sql` calls can mix
  // singleton `{ c }` rows with multi-row SELECT responses (same pattern as dashboard-stats-fetch).
  const countRows = await dbQuery<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause}`,
    params,
  );
  const totalCount = Number(countRows[0]?.c ?? 0);

  type ExecLeadSqlRow = {
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
    estimatedDealValue: unknown;
    closedRevenue: unknown;
    dealCurrency: string;
    cb_id: string | null;
    cb_name: string | null;
    cb_image: string | null;
  };

  async function fetchPaged() {
    return dbQuery<ExecLeadSqlRow>(
      `${execSelect}
       LIMIT ($${params.length + 1})::bigint OFFSET ($${params.length + 2})::bigint`,
      [...params, perPage, (page - 1) * perPage],
    );
  }

  let pagedLeadRows = await fetchPaged();
  if (pagedLeadRows.length === 0 && totalCount > 0) {
    pagedLeadRows = await fetchPaged();
  }

  const exportLeadRows = await dbQuery<ExecLeadSqlRow>(
    `${execSelect}
       LIMIT ($${params.length + 1})::bigint`,
    [...params, PORTAL_LEADS_EXPORT_ROW_CAP],
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (page > totalPages) {
    const qp = new URLSearchParams();
    if (from) qp.set("from", from);
    if (to) qp.set("to", to);
    if (q) qp.set("q", q);
    if (filters.status) qp.set("status", filters.status);
    if (filters.salesStage) qp.set("salesStage", filters.salesStage);
    if (filters.source) qp.set("source", filters.source);
    if (filters.sourceWebsiteName)
      qp.set("website", filters.sourceWebsiteName);
    qp.set("perPage", String(perPage));
    qp.set("page", "1");
    redirect(`/executive/leads?${qp.toString()}`);
  }
  const safePage = page;
  const leadRows = pagedLeadRows;
  logLeadsAudit("executive-leads", {
    page,
    perPage,
    totalCount,
    hasSearch: Boolean(q),
    hasDateRange: Boolean(from && to),
  });

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
    createdBy: {
      id: l.cb_id ?? "",
      name: l.cb_name ?? "Unknown analyst",
      image: l.cb_image,
    },
    estimatedDealValue: coerceMoney(l.estimatedDealValue),
    closedRevenue: coerceMoney(l.closedRevenue),
    dealCurrency: l.dealCurrency?.trim() || "USD",
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
      analystName: l.cb_name ?? "Unknown analyst",
      estimatedDealValue: coerceMoney(l.estimatedDealValue),
      closedRevenue: coerceMoney(l.closedRevenue),
      dealCurrency: l.dealCurrency?.trim() || "USD",
    }),
  );

  const paginationQuery = {
    from,
    to,
    q,
    ...(perPage !== 25 ? { perPage: String(perPage) } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.salesStage ? { salesStage: filters.salesStage } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.sourceWebsiteName
      ? { website: filters.sourceWebsiteName }
      : {}),
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <PortalDashboardTopPanel>
        <PortalDashboardTopPanelDateRow
          start={
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <AnalystDateRangeBar
                key={`${from ?? ""}|${to ?? ""}`}
                pathname="/executive/leads"
                defaultFrom={from ?? ""}
                defaultTo={to ?? ""}
                preservedEntries={preservedEntries}
                rangeSummary={rangeLabel}
                embedded
              />
              <div className="min-w-0 w-full sm:max-w-md sm:flex-1">
                <PortalDashboardSearchBar
                  key={q ?? ""}
                  initialQ={q}
                  pathname="/executive/leads"
                  showLabel={false}
                  embedded
                  nestInPanelRow
                />
              </div>
            </div>
          }
        />
        <PortalDashboardSqlFiltersBar
          key={`${filters.status ?? ""}|${filters.salesStage ?? ""}|${filters.source ?? ""}|${filters.sourceWebsiteName ?? ""}`}
          navigatePathname="/executive/leads"
          status={filters.status ?? null}
          salesStage={filters.salesStage ?? null}
          source={filters.source ?? null}
          website={filters.sourceWebsiteName ?? null}
          sourceOptions={sourceOptions}
          websiteOptions={websiteOptions}
          embedded
        />
      </PortalDashboardTopPanel>

      <ExecLeadsTableClient
        key={`${from ?? ""}|${to ?? ""}|${safePage}|${perPage}|${filters.status ?? ""}|${filters.salesStage ?? ""}|${filters.source ?? ""}|${filters.sourceWebsiteName ?? ""}|${q ?? ""}`}
        leads={rows}
        initialQ={q}
        rangeLabel={rangeLabel}
        exportLeads={execExportLeads}
        exportScope={exportScopeFromLeadFilters(filters)}
        rangeTotalCount={totalCount}
        hideClientSearch
        toolbarPagination={
          <PortalPaginationBar
            variant="toolbar"
            pathname="/executive/leads"
            query={paginationQuery}
            page={safePage}
            perPage={perPage}
            totalCount={totalCount}
          />
        }
      />
    </div>
  );
}
