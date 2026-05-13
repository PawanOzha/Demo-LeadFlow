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
  leadWhereSql,
  preservedSearchParamEntriesForDateBar,
  searchParamFirst,
} from "@/lib/analyst-date-range";
import { AnalystAllLeadsTableClient } from "@/components/portal-leads/analyst-all-leads-table-client";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import { logLeadsAudit, timedServerBlock } from "@/lib/server/log";
import { coerceMoney } from "@/lib/deal-money";
import { mergedPortalLeadFilters } from "@/lib/server/leads/filter-parser";
import { exportScopeFromLeadFilters } from "@/lib/portal-export-scope";
import {
  PORTAL_LEAD_SOURCE_FILTER_OPTIONS,
  PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS,
} from "@/lib/portal-lead-filter-options";

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
  const filters = mergedPortalLeadFilters(sp, { from, to, q });
  const pageRaw = Number.parseInt(searchParamFirst(sp, "page") ?? "", 10);
  const perPageRaw = Number.parseInt(searchParamFirst(sp, "perPage") ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const perPage: 25 | 50 | 200 =
    perPageRaw === 50 || perPageRaw === 200 ? perPageRaw : 25;
  const rangeLabel = analystRangeSummaryLabel(from, to);

  const { clause, params } = leadWhereSql(session.id, filters);

  const selectColumns = `
    id,
    "leadName",
    phone,
    "leadEmail",
    source,
    "portalWebsite",
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

  type PagedLeadRow = {
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
    estimatedDealValue: unknown;
    closedRevenue: unknown;
    dealCurrency: string;
  };

  const sourceOptions = PORTAL_LEAD_SOURCE_FILTER_OPTIONS;
  const websiteOptions = PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS;

  const { countRows, pagedLeads } = await timedServerBlock(
    "route:/analyst/leads page:queries",
    async () => {
      const cr = await dbQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause}`,
        params,
      );

      async function fetchPage() {
        return dbQuery<PagedLeadRow>(
          `SELECT ${selectColumns} FROM "Lead" l WHERE ${clause} ORDER BY l."createdAt" DESC, l.id DESC LIMIT ($${params.length + 1})::bigint OFFSET ($${params.length + 2})::bigint`,
          [...params, perPage, (page - 1) * perPage],
        );
      }
      let pl = await fetchPage();
      const total = Number(cr[0]?.c ?? 0);
      if (pl.length === 0 && total > 0) {
        pl = await fetchPage();
      }
      return { countRows: cr, pagedLeads: pl };
    },
  );

  const totalCount = Number(countRows[0]?.c ?? 0);
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
    portalWebsite: l.portalWebsite,
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
                pathname="/analyst/leads"
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
                  pathname="/analyst/leads"
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
          navigatePathname="/analyst/leads"
          status={filters.status ?? null}
          salesStage={filters.salesStage ?? null}
          source={filters.source ?? null}
          website={filters.sourceWebsiteName ?? null}
          sourceOptions={sourceOptions}
          websiteOptions={websiteOptions}
          embedded
        />
      </PortalDashboardTopPanel>

      <AnalystAllLeadsTableClient
        key={`${from ?? ""}|${to ?? ""}|${safePage}|${perPage}|${filters.status ?? ""}|${filters.salesStage ?? ""}|${filters.source ?? ""}|${filters.sourceWebsiteName ?? ""}|${q ?? ""}`}
        leads={rows}
        initialQ={q}
        from={from}
        to={to}
        rangeLabel={rangeLabel}
        exportFilters={{ from, to, q, status: filters.status ?? null, salesStage: filters.salesStage ?? null, source: filters.source ?? null, website: filters.sourceWebsiteName ?? null }}
        exportScope={exportScopeFromLeadFilters(filters)}
        rangeTotalCount={totalCount}
        hideClientSearch
        toolbarPagination={
          <PortalPaginationBar
            variant="toolbar"
            pathname="/analyst/leads"
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
