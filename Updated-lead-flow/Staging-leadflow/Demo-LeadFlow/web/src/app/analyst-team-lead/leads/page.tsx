import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db/pool";
import {
  fetchAtlLeadsListPage,
  type AtlJoinedLeadRow,
} from "@/lib/atl-lead-table-fetch";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import {
  PortalDashboardTopPanel,
  PortalDashboardTopPanelDateRow,
} from "@/components/portal-dashboard-top-panel";
import { PortalDashboardSearchBar } from "@/components/portal-dashboard-search-bar";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  preservedSearchParamEntriesForDateBar,
  searchParamFirst,
} from "@/lib/analyst-date-range";
import { atlLeadSql, atlListFiltersFromSearchParams } from "@/lib/atl-leads";
import { fetchAtlRoutingTimelines } from "@/lib/atl-routing-timeline";
import {
  AtlAllLeadsTableClient,
  type ExecOption,
  type MtlOption,
} from "@/components/portal-leads/atl-all-leads-table-client";
import { AtlLeadsFiltersBar } from "@/components/portal-leads/atl-leads-filters-bar";
import { UserRole } from "@/lib/constants";
import { teamAnalystTeamLeadColumnExists, claimUnassignedTeamsForSessionIfSingleAtlOrg } from "@/lib/team-atl-column";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import { exportScopeAtlDashboard } from "@/lib/portal-export-scope";
import { logLeadsAudit } from "@/lib/server/log";
import {
  PORTAL_LEAD_SOURCE_FILTER_OPTIONS,
  PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS,
} from "@/lib/portal-lead-filter-options";

function mapAtlRowsWithTimeline(
  leadRows: AtlJoinedLeadRow[],
  timelineByLead: Awaited<ReturnType<typeof fetchAtlRoutingTimelines>>,
) {
  const rows = leadRows.map((l) => ({
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
    teamId: l.teamId,
    assignedMainTeamLeadId: l.assignedMainTeamLeadId,
    createdBy: {
      id: l.cb_id ?? "",
      name: l.cb_name ?? "Unknown analyst",
      image: l.cb_image,
    },
    team: l.team_name ? { name: l.team_name } : null,
    assignedMainTeamLead:
      l.mtl_id && l.mtl_name
        ? { id: l.mtl_id, name: l.mtl_name, image: l.mtl_image }
        : null,
    assignedSalesExec:
      l.se_id && l.se_name
        ? { id: l.se_id, name: l.se_name, image: l.se_image }
        : null,
  }));

  return rows.map((r) => {
    const t = timelineByLead.get(r.id);
    return {
      ...r,
      routedToMainTeamAt: t?.routedToMainTeamAt?.toISOString() ?? null,
      assignedToExecutiveAt: t?.assignedToExecutiveAt?.toISOString() ?? null,
      directAssignedToExecutiveByAtlAt:
        t?.directAssignedToExecutiveByAtlAt?.toISOString() ?? null,
    };
  });
}

export default async function AnalystTeamLeadLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await claimUnassignedTeamsForSessionIfSingleAtlOrg(session.id);

  const sp = (await searchParams) ?? {};
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

  // Must fetch analysts first — all other queries depend on analystIds
  const analysts = await dbQuery<{ id: string; name: string }>(
    `SELECT id, name FROM "User" WHERE "managerId" = $1 AND role = $2 ORDER BY name ASC`,
    [session.id, UserRole.LEAD_ANALYST],
  );
  const analystIds = analysts.map((a) => a.id);

  const listFilters = atlListFiltersFromSearchParams(sp, analystIds, q);
  const statusFilter = listFilters.qualificationStatus;
  const analystIdFilter = listFilters.createdById;
  const sourceFilter = listFilters.source;
  const websiteFilter = listFilters.sourceWebsiteName;

  const { clause, params } = atlLeadSql(analystIds, from, to, listFilters, "l");

  const teamCol = await teamAnalystTeamLeadColumnExists();

  const countRows =
    analystIds.length === 0
      ? ([] as { c: string }[])
      : await dbQuery<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause}`,
          params,
        );

  const [pagedLeadRows, mtlRows, execRows] = await Promise.all([
      analystIds.length === 0
        ? Promise.resolve([] as AtlJoinedLeadRow[])
        : fetchAtlLeadsListPage(clause, params, perPage, (page - 1) * perPage),
      teamCol
        ? dbQuery<{
            id: string;
            name: string;
            team_id: string;
            team_name: string;
          }>(
            `SELECT u.id, u.name, t.id AS team_id, t.name AS team_name
         FROM "User" u
         INNER JOIN "Team" t ON t."mainTeamLeadId" = u.id
         WHERE u.role = $1 AND t."analystTeamLeadId" = $2`,
            [UserRole.MAIN_TEAM_LEAD, session.id],
          )
        : dbQuery<{
            id: string;
            name: string;
            team_id: string;
            team_name: string;
          }>(
            `SELECT u.id, u.name, t.id AS team_id, t.name AS team_name
         FROM "User" u
         INNER JOIN "Team" t ON t."mainTeamLeadId" = u.id
         WHERE u.role = $1`,
            [UserRole.MAIN_TEAM_LEAD],
          ),
      dbQuery<{
        id: string;
        name: string;
        email: string;
        team_id: string | null;
      }>(
        `SELECT id, name, email, "teamId" AS team_id
         FROM "User"
         WHERE role = $1
         ORDER BY name ASC`,
        [UserRole.SALES_EXECUTIVE],
      ),
    ]);

  const totalCount = Number(countRows[0]?.c ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  if (page > totalPages) {
    const qp = new URLSearchParams();
    if (q) qp.set("q", q);
    if (from) qp.set("from", from);
    if (to) qp.set("to", to);
    if (statusFilter) qp.set("status", statusFilter);
    if (analystIdFilter) qp.set("analystId", analystIdFilter);
    if (sourceFilter) qp.set("source", sourceFilter);
    if (websiteFilter) qp.set("website", websiteFilter);
    qp.set("perPage", String(perPage));
    qp.set("page", "1");
    redirect(`/analyst-team-lead/leads?${qp.toString()}`);
  }

  logLeadsAudit("analyst-team-lead-leads", {
    page,
    perPage,
    totalCount,
    analystCount: analystIds.length,
    hasSearch: Boolean(q),
    hasDateRange: Boolean(from && to),
    statusFilter: statusFilter ?? "ALL",
    hasAnalystFilter: Boolean(analystIdFilter),
    hasSourceFilter: Boolean(sourceFilter),
    hasWebsiteFilter: Boolean(websiteFilter),
  });

  // Timeline fetch depends on page rows — kept sequential intentionally
  type FetchedTimeline = Awaited<ReturnType<typeof fetchAtlRoutingTimelines>>;
  const pagedTimeline: FetchedTimeline =
    pagedLeadRows.length > 0
      ? await fetchAtlRoutingTimelines(pagedLeadRows.map((l) => l.id))
      : new Map();

  const sourceOptions = PORTAL_LEAD_SOURCE_FILTER_OPTIONS;
  const websiteOptions = PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS;
  const mtlOptions: MtlOption[] = mtlRows.map((u) => ({
    id: u.id,
    name: u.name,
    teamId: u.team_id,
    teamName: u.team_name,
  }));
  const execOptions: ExecOption[] = execRows
    .filter((u): u is { id: string; name: string; email: string; team_id: string } =>
      Boolean(u.team_id),
    )
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      teamId: u.team_id,
    }));

  const rowsWithTimeline = mapAtlRowsWithTimeline(pagedLeadRows, pagedTimeline);

  const hasServerFilters = Boolean(
    statusFilter || analystIdFilter || sourceFilter || websiteFilter || q,
  );

  const paginationQuery = {
    q,
    ...(perPage !== 25 ? { perPage: String(perPage) } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(analystIdFilter ? { analystId: analystIdFilter } : {}),
    ...(sourceFilter ? { source: sourceFilter } : {}),
    ...(websiteFilter ? { website: websiteFilter } : {}),
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <PortalDashboardTopPanel>
        <PortalDashboardTopPanelDateRow
          start={
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <AnalystDateRangeBar
                key={`${from ?? ""}|${to ?? ""}`}
                pathname="/analyst-team-lead/leads"
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
                  pathname="/analyst-team-lead/leads"
                  showLabel={false}
                  embedded
                  nestInPanelRow
                />
              </div>
            </div>
          }
        />
        <AtlLeadsFiltersBar
          key={`${statusFilter ?? ""}|${analystIdFilter ?? ""}|${sourceFilter ?? ""}|${websiteFilter ?? ""}`}
          navigatePathname="/analyst-team-lead/leads"
          status={statusFilter ?? null}
          analystId={analystIdFilter ?? null}
          source={sourceFilter ?? null}
          website={websiteFilter ?? null}
          analystOptions={analysts.map((a) => ({ id: a.id, name: a.name }))}
          sourceOptions={sourceOptions}
          websiteOptions={websiteOptions}
          embedded
        />
      </PortalDashboardTopPanel>

      <div className="min-w-0 space-y-6">
        <AtlAllLeadsTableClient
          key={`${page}|${perPage}|${from ?? ""}|${to ?? ""}|${statusFilter ?? ""}|${analystIdFilter ?? ""}|${sourceFilter ?? ""}|${websiteFilter ?? ""}|${q ?? ""}`}
          leads={rowsWithTimeline}
          initialQ={q}
          from={from}
          to={to}
          analystIdsEmpty={analystIds.length === 0}
          mtlOptions={mtlOptions}
          execOptions={execOptions}
          rangeLabel={rangeLabel}
          rangeTotalCount={totalCount}
          hasServerFilters={hasServerFilters}
          exportFilters={{
            from,
            to,
            status: statusFilter ?? null,
            analystId: analystIdFilter ?? null,
            source: sourceFilter ?? null,
            website: websiteFilter ?? null,
            q,
          }}
          exportScope={exportScopeAtlDashboard(from, to, q, {
            qualificationStatus: statusFilter ?? null,
            createdById: analystIdFilter ?? null,
            source: sourceFilter ?? null,
            sourceWebsiteName: websiteFilter ?? null,
          })}
          hideClientSearch
          toolbarPagination={
            <PortalPaginationBar
              variant="toolbar"
              pathname="/analyst-team-lead/leads"
              query={paginationQuery}
              page={page}
              perPage={perPage}
              totalCount={totalCount}
            />
          }
        />
      </div>
    </div>
  );
}
