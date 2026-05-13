import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
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
import { AnalystPipelineTableClient } from "@/components/portal-leads/analyst-pipeline-table-client";
import { QualificationStatus, SalesStage } from "@/lib/constants";
import { timedServerBlock } from "@/lib/server/log";
import { mergedPortalLeadFilters } from "@/lib/server/leads/filter-parser";
import {
  PORTAL_LEAD_SOURCE_FILTER_OPTIONS,
  PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS,
} from "@/lib/portal-lead-filter-options";

const PAGE_SIZE = 100;

/** Same unqualified column list + `FROM "Lead" l` pattern as {@link AnalystAllLeadsPage} (minus deal/email). */
const PIPELINE_PAGE_SELECT_COLUMNS = `
  id,
  "leadName",
  phone,
  source,
  notes,
  "lostNotes",
  "qualificationStatus",
  "leadScore",
  "salesStage",
  "createdAt"
`;

export default async function AnalystPipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const pageRaw = searchParamFirst(sp, "page");
  const page = Math.max(1, Number(pageRaw ?? 1) || 1);
  const [preservedEntries, { from, to, q }] = await Promise.all([
    preservedSearchParamEntriesForDateBar(sp),
    analystRangeParams(sp),
  ]);
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const filters = mergedPortalLeadFilters(sp, { from, to, q });
  const { clause, params } = leadWhereSql(session.id, filters);
  const offset = (page - 1) * PAGE_SIZE;

  type QualifiedListRow = {
    qualificationStatus: string;
    salesStage: string;
    id: string;
    leadName: string;
    phone: string | null;
    source: string;
    notes: string | null;
    lostNotes: string | null;
    leadScore: number | null;
    createdAt: Date;
  };

  const {
    qualified,
    qualifiedTotal,
    totalPages,
    ownedLeadTotal,
    summaryRows,
  } = await timedServerBlock("route:/analyst/pipeline page:queries", async () => {
      // Match `/analyst/leads`: one paged SELECT + same retry when rows are empty but COUNT > 0 (hosted exec_sql quirk).
      // Keep KPI/source queries after the page fetch; run sequentially to avoid RPC response cross-wire.
      const qualParam = params.length + 1;
      const limParam = params.length + 2;
      const offParam = params.length + 3;
      const n = params.length;

      const countRows = await dbQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause} AND l."qualificationStatus" = $${qualParam}`,
        [...params, QualificationStatus.QUALIFIED],
      );
      const qualifiedTotalInner = Number(countRows[0]?.c ?? 0);

      async function fetchQualifiedPage() {
        return dbQuery<QualifiedListRow>(
          `SELECT ${PIPELINE_PAGE_SELECT_COLUMNS} FROM "Lead" l WHERE ${clause} AND l."qualificationStatus" = $${qualParam} ORDER BY l."createdAt" DESC, l.id DESC LIMIT ($${limParam})::bigint OFFSET ($${offParam})::bigint`,
          [...params, QualificationStatus.QUALIFIED, PAGE_SIZE, offset],
        );
      }

      let qualifiedInner = await fetchQualifiedPage();
      if (qualifiedInner.length === 0 && qualifiedTotalInner > 0) {
        qualifiedInner = await fetchQualifiedPage();
      }

      const totalPagesInner = Math.max(
        1,
        Math.ceil(qualifiedTotalInner / PAGE_SIZE),
      );
      let ownedLeadTotalInner = 0;
      if (qualifiedTotalInner === 0) {
        const ownedRows = await dbQuery<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause}`,
          params,
        );
        ownedLeadTotalInner = Number(ownedRows[0]?.c ?? 0);
      }

      const assignedRows = await dbQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause} AND l."qualificationStatus" = $${n + 1} AND (l."salesStage" = $${n + 2} OR l."salesStage" = $${n + 3})`,
        [
          ...params,
          QualificationStatus.QUALIFIED,
          SalesStage.PRE_SALES,
          SalesStage.WITH_TEAM_LEAD,
        ],
      );
      const inProgressRows = await dbQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause} AND l."qualificationStatus" = $${n + 1} AND l."salesStage" = $${n + 2}`,
        [...params, QualificationStatus.QUALIFIED, SalesStage.WITH_EXECUTIVE],
      );
      const wonRows = await dbQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause} AND l."qualificationStatus" = $${n + 1} AND l."salesStage" = $${n + 2}`,
        [...params, QualificationStatus.QUALIFIED, SalesStage.CLOSED_WON],
      );
      const lostRows = await dbQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE ${clause} AND l."qualificationStatus" = $${n + 1} AND l."salesStage" = $${n + 2}`,
        [...params, QualificationStatus.QUALIFIED, SalesStage.CLOSED_LOST],
      );
      const summaryRowsInner = [
        {
          assigned: assignedRows[0]?.c ?? "0",
          inProgress: inProgressRows[0]?.c ?? "0",
          won: wonRows[0]?.c ?? "0",
          lost: lostRows[0]?.c ?? "0",
        },
      ];

      return {
        qualified: qualifiedInner,
        qualifiedTotal: qualifiedTotalInner,
        totalPages: totalPagesInner,
        ownedLeadTotal: ownedLeadTotalInner,
        summaryRows: summaryRowsInner,
      };
    });

  const sourceOptions = PORTAL_LEAD_SOURCE_FILTER_OPTIONS;
  const websiteOptions = PORTAL_LEAD_WEBSITE_BRAND_FILTER_OPTIONS;

  if (page > totalPages && qualifiedTotal > 0) {
    const qp = new URLSearchParams();
    if (from) qp.set("from", from);
    if (to) qp.set("to", to);
    if (q) qp.set("q", q);
    if (filters.status) qp.set("status", filters.status);
    if (filters.salesStage) qp.set("salesStage", filters.salesStage);
    if (filters.source) qp.set("source", filters.source);
    if (filters.sourceWebsiteName)
      qp.set("website", filters.sourceWebsiteName);
    qp.set("page", "1");
    redirect(`/analyst/pipeline?${qp.toString()}`);
  }

  const summary = summaryRows[0];
  const assigned = Number(summary?.assigned ?? 0);
  const inProgress = Number(summary?.inProgress ?? 0);
  const won = Number(summary?.won ?? 0);
  const lost = Number(summary?.lost ?? 0);

  const qualifiedRows = qualified.map((l) => {
    const created =
      l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt);
    return {
      id: l.id,
      leadName: l.leadName,
      phone: l.phone,
      source: l.source,
      notes: l.notes,
      lostNotes: l.lostNotes,
      qualificationStatus: l.qualificationStatus,
      salesStage: l.salesStage,
      leadScore: l.leadScore,
      createdAt: created.toISOString(),
    };
  });

  const safePage = page;
  const safeOffset = (safePage - 1) * PAGE_SIZE;

  const buildPipelineQs = (p: number) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (q) qs.set("q", q);
    if (filters.status) qs.set("status", filters.status);
    if (filters.salesStage) qs.set("salesStage", filters.salesStage);
    if (filters.source) qs.set("source", filters.source);
    if (filters.sourceWebsiteName)
      qs.set("website", filters.sourceWebsiteName);
    qs.set("page", String(p));
    return qs.toString();
  };

  const prevHref =
    safePage > 1 ? `/analyst/pipeline?${buildPipelineQs(safePage - 1)}` : null;
  const nextHref =
    safePage < totalPages
      ? `/analyst/pipeline?${buildPipelineQs(safePage + 1)}`
      : null;

  return (
    <div className="w-full min-w-0 space-y-8">
      <PortalDashboardTopPanel>
        <PortalDashboardTopPanelDateRow
          start={
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <AnalystDateRangeBar
                key={`${from ?? ""}|${to ?? ""}`}
                pathname="/analyst/pipeline"
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
                  pathname="/analyst/pipeline"
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
          navigatePathname="/analyst/pipeline"
          status={filters.status ?? null}
          salesStage={filters.salesStage ?? null}
          source={filters.source ?? null}
          website={filters.sourceWebsiteName ?? null}
          sourceOptions={sourceOptions}
          websiteOptions={websiteOptions}
          embedded
        />
      </PortalDashboardTopPanel>

      <div className="flex gap-3 rounded-xl border border-lf-accent/30 bg-lf-accent/10 px-4 py-3 text-sm text-lf-link">
        <span className="shrink-0 font-bold text-lf-link" aria-hidden>
          ⓘ
        </span>
        <p>
          You can see outcome statuses for privacy — sales executive names and
          call details are not shown here. For closed lost, Notes shows the
          executive’s loss reason when recorded.
        </p>
      </div>

      {qualifiedTotal === 0 && ownedLeadTotal > 0 ? (
        <div
          role="note"
          className="rounded-xl border border-lf-border bg-lf-surface px-4 py-3 text-[13px] text-lf-muted shadow-sm"
        >
          No qualified leads match this filter ({ownedLeadTotal.toLocaleString()}{" "}
          owned in scope on{" "}
          <Link href="/analyst/leads" className="font-medium text-lf-link underline-offset-4 hover:underline">
            All leads
          </Link>
          ). Clear search, widen the date range, or relax status / stage / source filters.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            [
              "Assigned / internal",
              assigned,
              "text-lf-warning",
            ],
            ["In progress", inProgress, "text-lf-accent"],
            ["Closed won", won, "text-lf-success"],
            ["Closed lost", lost, "text-lf-danger"],
          ] as const
        ).map(([label, val, color]) => (
          <div
            key={label}
            className="rounded-2xl border border-lf-border bg-lf-surface p-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
              {label}
            </p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${color}`}>
              {val}
            </p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lf-border bg-lf-surface p-4 shadow-sm">
        <p className="text-lf-subtle text-[13px]">
          Showing{" "}
          <span className="font-semibold text-lf-text tabular-nums">
            {qualifiedTotal === 0 ? 0 : safeOffset + 1}-
            {Math.min(safeOffset + PAGE_SIZE, qualifiedTotal)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-lf-text tabular-nums">
            {qualifiedTotal}
          </span>{" "}
          qualified leads
        </p>
        <div className="flex items-center gap-2">
          {prevHref ? (
            <Link
              href={prevHref}
              className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border border-lf-border px-3 py-1.5 text-xs text-lf-subtle opacity-50">
              Previous
            </span>
          )}
          <span className="text-xs text-lf-subtle tabular-nums">
            Page {safePage} of {totalPages}
          </span>
          {nextHref ? (
            <Link
              href={nextHref}
              className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-lg border border-lf-border px-3 py-1.5 text-xs text-lf-subtle opacity-50">
              Next
            </span>
          )}
        </div>
      </div>

      <AnalystPipelineTableClient
        key={`${from ?? ""}|${to ?? ""}|${filters.status ?? ""}|${filters.salesStage ?? ""}|${filters.source ?? ""}|${q ?? ""}|p${safePage}`}
        qualified={qualifiedRows}
        initialQ={q}
        from={from}
        to={to}
        hideClientSearch
      />
    </div>
  );
}
