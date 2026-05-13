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
  analystRangeSummaryLabel,
  analystRangeParams,
  preservedSearchParamEntriesForDateBar,
  searchParamFirst,
} from "@/lib/analyst-date-range";
import { mtlLeadSql } from "@/lib/mtl-leads";
import { mergedPortalLeadFilters } from "@/lib/server/leads/filter-parser";
import { exportScopeFromLeadFilters } from "@/lib/portal-export-scope";
import {
  PORTAL_LEAD_SOURCE_FILTER_OPTIONS,
  PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS,
} from "@/lib/portal-lead-filter-options";
import { MtlLeadsTableClient } from "@/components/portal-leads/mtl-leads-table-client";
import { UserRole } from "@/lib/constants";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import type { PortalMtlLeadExportRow } from "@/lib/portal-all-leads-export-payloads";
import { buildMtlLeadsExportPayloadFromPortalRows } from "@/lib/portal-all-leads-export-payloads";
import { logLeadsAudit } from "@/lib/server/log";

export default async function TeamLeadLeadsPage({
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
  const { clause, params } = mtlLeadSql(session.id, filters);
  const sourceOptions = PORTAL_LEAD_SOURCE_FILTER_OPTIONS;
  const websiteOptions = PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS;

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
       COALESCE(cb.id, l."createdById") AS cb_id,
       cb.name AS cb_name,
       cb.image AS cb_image,
       se.id AS se_id,
       se.name AS se_name,
       se.image AS se_image
       FROM "Lead" l
       LEFT JOIN "User" cb ON cb.id = l."createdById"
       LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
       WHERE ${clause}
       ORDER BY l."createdAt" DESC, l.id DESC`;

  const countRows = await dbQuery<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause}`,
    params,
  );
  const totalCount = Number(countRows[0]?.c ?? 0);

  type MtlLeadSqlRow = {
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
    cb_id: string | null;
    cb_name: string | null;
    cb_image: string | null;
    se_id: string | null;
    se_name: string | null;
    se_image: string | null;
  };

  async function fetchMtlPaged() {
    return dbQuery<MtlLeadSqlRow>(
      `${mtlSelect}
       LIMIT ($${params.length + 1})::bigint OFFSET ($${params.length + 2})::bigint`,
      [...params, perPage, (page - 1) * perPage],
    );
  }

  let pagedLeadRows = await fetchMtlPaged();
  if (pagedLeadRows.length === 0 && totalCount > 0) {
    pagedLeadRows = await fetchMtlPaged();
  }

  const exportLeadRows = await dbQuery<MtlLeadSqlRow>(
    `${mtlSelect}
       LIMIT ($${params.length + 1})::bigint`,
    [...params, PORTAL_LEADS_EXPORT_ROW_CAP],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (page > totalPages) {
    const qp = new URLSearchParams();
    if (q) qp.set("q", q);
    if (from) qp.set("from", from);
    if (to) qp.set("to", to);
    if (filters.status) qp.set("status", filters.status);
    if (filters.salesStage) qp.set("salesStage", filters.salesStage);
    if (filters.source) qp.set("source", filters.source);
    if (filters.sourceWebsiteName)
      qp.set("website", filters.sourceWebsiteName);
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
    hasSearch: Boolean(q),
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
    createdBy: {
      id: l.cb_id ?? "",
      name: l.cb_name ?? "Unknown analyst",
      image: l.cb_image,
    },
    assignedSalesExec:
      l.se_id && l.se_name
        ? { id: l.se_id, name: l.se_name, image: l.se_image }
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

  const mtlLeadsTopPanelExportPayload = buildMtlLeadsExportPayloadFromPortalRows(
    mtlExportLeads,
    {
      rangeLabel,
      searchQuery: q ?? "",
      rangeTotalCount: totalCount,
      exportRowCount: mtlExportLeads.length,
    },
  );

  const paginationQuery = {
    q,
    ...(perPage !== 25 ? { perPage: String(perPage) } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
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
                pathname="/team-lead/leads"
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
                  pathname="/team-lead/leads"
                  showLabel={false}
                  embedded
                  nestInPanelRow
                />
              </div>
            </div>
          }
          end={
            <DashboardReportExport
              payload={mtlLeadsTopPanelExportPayload}
              exportScope={exportScopeFromLeadFilters(filters)}
            />
          }
        />
        <PortalDashboardSqlFiltersBar
          key={`${filters.status ?? ""}|${filters.salesStage ?? ""}|${filters.source ?? ""}|${filters.sourceWebsiteName ?? ""}`}
          navigatePathname="/team-lead/leads"
          status={filters.status ?? null}
          salesStage={filters.salesStage ?? null}
          source={filters.source ?? null}
          website={filters.sourceWebsiteName ?? null}
          sourceOptions={sourceOptions}
          websiteOptions={websiteOptions}
          embedded
        />
      </PortalDashboardTopPanel>

      <MtlLeadsTableClient
        key={`${from ?? ""}|${to ?? ""}|${safePage}|${perPage}|${filters.status ?? ""}|${filters.salesStage ?? ""}|${filters.source ?? ""}|${filters.sourceWebsiteName ?? ""}|${q ?? ""}`}
        leads={rows}
        initialQ={q}
        execs={execOptions}
        rangeLabel={rangeLabel}
        exportLeads={mtlExportLeads}
        exportScope={exportScopeFromLeadFilters(filters)}
        rangeTotalCount={totalCount}
        hideClientSearch
        toolbarExport={false}
        toolbarPagination={
          <PortalPaginationBar
            variant="toolbar"
            pathname="/team-lead/leads"
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
