import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SuperadminLeadsToolbar } from "@/components/superadmin/superadmin-leads-toolbar";
import { UserRole } from "@/lib/constants";
import { coerceMoney } from "@/lib/deal-money";
import { getSuperadminLeadsWithJourney } from "@/lib/superadmin-stats";
import {
  buildSuperadminLeadsWhereSql,
  parseSuperadminLeadsSearchParams,
  superadminLeadsFilterSummary,
} from "@/lib/superadmin-leads-filters";
import { dbQuery } from "@/lib/db/pool";
import { SuperadminLeadsJourneyClient } from "@/components/superadmin/superadmin-leads-journey-client";
import { logLeadsAudit, timedServerBlock } from "@/lib/server/log";
import { superadminLeadsParsedExportScope } from "@/lib/portal-export-scope";
import { PortalSectionJumpTabs } from "@/components/portal-section-jump-tabs";

export const metadata: Metadata = {
  title: "Leads · Superadmin",
};

function first(sp: string | string[] | undefined): string | undefined {
  if (Array.isArray(sp)) return sp[0];
  return sp;
}

function sectionHref(
  sp: Record<string, string | string[] | undefined>,
  section: string,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const fv = first(v);
    if (!fv || k === "leadsSection") continue;
    qs.set(k, fv);
  }
  qs.set("leadsSection", section);
  return `/superadmin/leads?${qs.toString()}`;
}

function PaginationBar({
  totalCount,
  offset,
  perPage,
  page,
  totalPages,
  prevHref,
  nextHref,
}: {
  totalCount: number;
  offset: number;
  perPage: number;
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
}) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-lf-border bg-lf-bg/90 px-3 py-2.5 text-[13px]">
      <p className="text-lf-subtle">
        Showing{" "}
        <span className="font-semibold text-lf-text">
          {totalCount === 0 ? 0 : offset + 1}-
          {Math.min(offset + perPage, totalCount)}
        </span>{" "}
        of <span className="font-semibold text-lf-text">{totalCount}</span> leads
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-lf-border px-3 py-1.5 text-xs text-lf-subtle opacity-50">
            Previous
          </span>
        )}
        <span className="text-xs text-lf-subtle">
          Page {Math.min(page, totalPages)} of {totalPages}
        </span>
        {nextHref ? (
          <Link
            href={nextHref}
            className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover"
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
  );
}

function RevenueSummaryCard({
  title,
  amount,
  hint,
}: {
  title: string;
  amount: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-lf-border bg-lf-surface px-5 py-4 shadow-sm">
      <p className="text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        {title}
      </p>
      <p className="mt-2 text-[22px] font-semibold tracking-tight text-lf-text tabular-nums">
        {amount.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] text-lf-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function QualSummaryCard({
  title,
  count,
  accent,
}: {
  title: string;
  count: number;
  accent: "positive" | "neutral" | "muted";
}) {
  const ring =
    accent === "positive"
      ? "border-lf-success/35 bg-lf-success/[0.07]"
      : accent === "neutral"
        ? "border-lf-warning/35 bg-lf-warning/[0.07]"
        : "border-lf-border bg-lf-bg/80";
  return (
    <div className={`rounded-xl border px-5 py-4 ${ring}`}>
      <p className="text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        {title}
      </p>
      <p className="mt-2 text-[22px] font-semibold tracking-tight text-lf-text tabular-nums">
        {count}
      </p>
    </div>
  );
}

export default async function SuperadminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sectionRaw = first(sp.leadsSection);
  const leadsSection =
    sectionRaw === "journey-table" ? "journey-table" : "summary";
  const parsedRaw = parseSuperadminLeadsSearchParams(sp);
  const [teams, execs, analysts] = await timedServerBlock(
    "route:/superadmin/leads page:filter-options",
    () =>
      Promise.all([
        dbQuery<{ id: string; name: string }>(
          `SELECT id, name FROM "Team" ORDER BY name ASC`,
        ),
        dbQuery<{ id: string; name: string; email: string }>(
          `SELECT id, name, email FROM "User" WHERE role = $1 ORDER BY name ASC`,
          [UserRole.SALES_EXECUTIVE],
        ),
        dbQuery<{ id: string; name: string; email: string }>(
          `SELECT id, name, email FROM "User" WHERE role = $1 ORDER BY name ASC`,
          [UserRole.LEAD_ANALYST],
        ),
      ]),
  );
  const parsed = {
    ...parsedRaw,
    analystId:
      parsedRaw.analystId && analysts.some((a) => a.id === parsedRaw.analystId)
        ? parsedRaw.analystId
        : null,
    teamId:
      parsedRaw.teamId && teams.some((t) => t.id === parsedRaw.teamId)
        ? parsedRaw.teamId
        : null,
    execId:
      parsedRaw.execId && execs.some((e) => e.id === parsedRaw.execId)
        ? parsedRaw.execId
        : null,
  };
  const where = buildSuperadminLeadsWhereSql(parsed);
  const page = Math.max(1, parsed.page);
  const perPage = parsed.perPage;
  const shouldRenderJourneyTable = leadsSection === "journey-table";
  const offset = (page - 1) * perPage;
  const emptyJourneyResult: Awaited<
    ReturnType<typeof getSuperadminLeadsWithJourney>
  > = {
    qualTotals: { qualified: 0, notQualified: 0, irrelevant: 0 },
    analystGroups: [],
    flatLeads: [],
  };

  // Aggregated stats row first: parallel `exec_sql` with multi-row selects can mix responses.
  const [statsRows, duplicateRows, paged] = await timedServerBlock(
    "route:/superadmin/leads page:queries",
    async () => {
      const statsRows = await dbQuery<{
        total: string;
        qualified: string;
        not_qualified: string;
        irrelevant: string;
        closed_rev: string;
        pipeline_est: string;
      }>(
        `SELECT
            COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE "qualificationStatus" = 'QUALIFIED')::text AS qualified,
            COUNT(*) FILTER (WHERE "qualificationStatus" = 'NOT_QUALIFIED')::text AS not_qualified,
            COUNT(*) FILTER (WHERE "qualificationStatus" = 'IRRELEVANT')::text AS irrelevant,
            COALESCE(SUM(CASE WHEN "salesStage" = 'CLOSED_WON' AND "closedRevenue" IS NOT NULL THEN "closedRevenue" ELSE 0 END), 0)::text AS closed_rev,
            COALESCE(SUM(CASE WHEN "estimatedDealValue" IS NOT NULL THEN "estimatedDealValue" ELSE 0 END), 0)::text AS pipeline_est
           FROM "Lead" WHERE ${where.clause}`,
        where.params,
      );
      const [duplicateRows, paged] = await Promise.all([
        shouldRenderJourneyTable
          ? dbQuery<{ lead_id: string; dup_count: string }>(
              `WITH filtered AS (
                 SELECT
                   id,
                   NULLIF(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), '') AS phone_key
                 FROM "Lead"
                 WHERE ${where.clause}
               ),
               phone_dups AS (
                 SELECT phone_key, COUNT(*)::int AS c
                 FROM filtered
                 WHERE phone_key IS NOT NULL
                 GROUP BY phone_key
                 HAVING COUNT(*) > 1
               )
               SELECT f.id AS lead_id, pd.c::text AS dup_count
               FROM filtered f
               JOIN phone_dups pd ON pd.phone_key = f.phone_key`,
              where.params,
            )
          : Promise.resolve([] as { lead_id: string; dup_count: string }[]),
        shouldRenderJourneyTable
          ? getSuperadminLeadsWithJourney(where, { limit: perPage, offset })
          : Promise.resolve(emptyJourneyResult),
      ]);
      return [statsRows, duplicateRows, paged] as const;
    },
  );

  const stats = statsRows[0] ?? { total: "0", qualified: "0", not_qualified: "0", irrelevant: "0", closed_rev: "0", pipeline_est: "0" };
  const totalCount = Number(stats.total);
  const qualTotals = {
    qualified: Number(stats.qualified),
    notQualified: Number(stats.not_qualified),
    irrelevant: Number(stats.irrelevant),
  };
  const filteredClosedRevenueTotal = Number(stats.closed_rev);
  const filteredPipelineEstimateTotal = Number(stats.pipeline_est);
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (page > totalPages) {
    const qp = new URLSearchParams();
    if (parsed.from) qp.set("from", parsed.from);
    if (parsed.to) qp.set("to", parsed.to);
    if (parsed.q) qp.set("q", parsed.q);
    if (parsed.duplicatePhonesOnly) qp.set("duplicatePhonesOnly", "1");
    if (parsed.status) qp.set("status", parsed.status);
    if (parsed.analystId) qp.set("analystId", parsed.analystId);
    if (parsed.teamId) qp.set("teamId", parsed.teamId);
    if (parsed.execId) qp.set("execId", parsed.execId);
    if (sp.leadsSection && first(sp.leadsSection)) {
      qp.set("leadsSection", first(sp.leadsSection)!);
    }
    qp.set("perPage", String(perPage));
    qp.set("page", "1");
    redirect(`/superadmin/leads?${qp.toString()}`);
  }
  const safePage = page;
  const safeOffset = (safePage - 1) * perPage;
  const analystGroups = paged.analystGroups;
  logLeadsAudit("superadmin-leads", {
    whereClause: where.clause,
    whereParamCount: where.params.length,
    page,
    perPage,
    totalCount,
    leadsSection,
    status: parsed.status,
    hasSearch: Boolean(parsed.q),
    hasDateRange: Boolean(parsed.from && parsed.to),
  });

  const teamMeta = parsed.teamId
    ? teams.find((t) => t.id === parsed.teamId)
    : null;
  const teamName = teamMeta?.name ?? null;
  const execUser = parsed.execId
    ? execs.find((e) => e.id === parsed.execId)
    : null;
  const execLabel = execUser
    ? `${execUser.name} (${execUser.email})`
    : null;

  const analystUser = parsed.analystId
    ? analysts.find((a) => a.id === parsed.analystId)
    : null;
  const analystLabel = analystUser
    ? `${analystUser.name} (${analystUser.email})`
    : null;
  const filterSummary = superadminLeadsFilterSummary(parsed, {
    analystLabel,
    teamName,
    execLabel,
  });

  const duplicateMap = new Map<
    string,
    { byPhone: boolean; maxGroupSize: number }
  >();
  for (const row of duplicateRows) {
    const prev = duplicateMap.get(row.lead_id) ?? { byPhone: false, maxGroupSize: 0 };
    duplicateMap.set(row.lead_id, {
      byPhone: true,
      maxGroupSize: Math.max(prev.maxGroupSize, Number(row.dup_count)),
    });
  }

  const analystGroupsClient = analystGroups.map((group) => ({
    analyst: group.analyst,
    leads: group.leads.map((lead) => ({
      id: lead.id,
      leadName: lead.leadName,
      phone: lead.phone,
      leadEmail: lead.leadEmail,
      country: lead.country,
      city: lead.city,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      qualificationStatus: lead.qualificationStatus,
      source: lead.source,
      sourceWebsiteName: lead.sourceWebsiteName,
      sourceMetaProfileName: lead.sourceMetaProfileName,
      notes: lead.notes,
      lostNotes: lead.lostNotes,
      leadScore: lead.leadScore,
      salesStage: lead.salesStage,
      execAssignedAt: lead.execAssignedAt?.toISOString() ?? null,
      execDeadlineAt: lead.execDeadlineAt?.toISOString() ?? null,
      closedAt: lead.closedAt?.toISOString() ?? null,
      estimatedDealValue: coerceMoney(lead.estimatedDealValue),
      closedRevenue: coerceMoney(lead.closedRevenue),
      dealCurrency: lead.dealCurrency?.trim() || "USD",
      internalReassignCount: lead.internalReassignCount,
      assignedMainTeamLead: lead.assignedMainTeamLead,
      team: lead.team,
      assignedSalesExec: lead.assignedSalesExec,
      duplicateMeta: duplicateMap.get(lead.id) ?? null,
      handoffLogs: lead.handoffLogs.map((h) => ({
        id: h.id,
        createdAt: h.createdAt.toISOString(),
        action: h.action,
        detail: h.detail,
        actor: h.actor,
      })),
    })),
  }));

  const filtersKey = `${parsed.from ?? ""}|${parsed.to ?? ""}|${parsed.q ?? ""}|${parsed.duplicatePhonesOnly ? "1" : "0"}|${parsed.status}|${parsed.analystId ?? ""}|${parsed.teamId ?? ""}|${parsed.execId ?? ""}|${parsed.perPage}|${parsed.page}`;
  const qp = new URLSearchParams();
  if (parsed.from) qp.set("from", parsed.from);
  if (parsed.to) qp.set("to", parsed.to);
  if (parsed.q) qp.set("q", parsed.q);
  if (parsed.duplicatePhonesOnly) qp.set("duplicatePhonesOnly", "1");
  if (parsed.status) qp.set("status", parsed.status);
  if (parsed.analystId) qp.set("analystId", parsed.analystId);
  if (parsed.teamId) qp.set("teamId", parsed.teamId);
  if (parsed.execId) qp.set("execId", parsed.execId);
  qp.set("perPage", String(perPage));
  const prevHref =
    safePage > 1
      ? `/superadmin/leads?${new URLSearchParams({
          ...Object.fromEntries(qp.entries()),
          page: String(safePage - 1),
        }).toString()}`
      : null;
  const nextHref =
    safePage < totalPages
      ? `/superadmin/leads?${new URLSearchParams({
          ...Object.fromEntries(qp.entries()),
          page: String(safePage + 1),
        }).toString()}`
      : null;
  const tabs = [
    { id: "summary", label: "Summary", href: sectionHref(sp, "summary") },
    {
      id: "journey-table",
      label: "Journey table",
      href: sectionHref(sp, "journey-table"),
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="min-w-0 space-y-4">
        <PortalSectionJumpTabs tabs={tabs} activeId={leadsSection} />
        <SuperadminLeadsToolbar
          key={filtersKey}
          showExport={leadsSection === "journey-table"}
          totalCount={totalCount}
          filterSummary={filterSummary}
          filtersKey={filtersKey}
          initial={parsed}
          analysts={analysts}
          teams={teams}
          execs={execs}
          exportScope={superadminLeadsParsedExportScope(parsed)}
        />
      </div>

      <div className="space-y-8 min-w-0">
          {leadsSection === "summary" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <QualSummaryCard
                  title="Total (current filters)"
                  count={totalCount}
                  accent="muted"
                />
                <QualSummaryCard
                  title="Qualified"
                  count={qualTotals.qualified}
                  accent="positive"
                />
                <QualSummaryCard
                  title="Not qualified"
                  count={qualTotals.notQualified}
                  accent="neutral"
                />
                <QualSummaryCard
                  title="Irrelevant"
                  count={qualTotals.irrelevant}
                  accent="muted"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <RevenueSummaryCard
                  title="Closed revenue (current filters)"
                  amount={filteredClosedRevenueTotal}
                  hint="Sum of closed revenue on won leads in this view. Amounts in different currencies are summed numerically."
                />
                <RevenueSummaryCard
                  title="Pipeline estimate (current filters)"
                  amount={filteredPipelineEstimateTotal}
                  hint="Sum of analyst deal estimates for leads in this view."
                />
              </div>
            </>
          ) : (
            <>
              <PaginationBar
                totalCount={totalCount}
                offset={safeOffset}
                perPage={perPage}
                page={safePage}
                totalPages={totalPages}
                prevHref={prevHref}
                nextHref={nextHref}
              />

              {analystGroups.length === 0 ? (
                <p className="text-[13px] font-normal text-lf-label">
                  {totalCount === 0
                    ? "No leads match these filters."
                    : "Leads match your filters (see count above), but rows failed to load. Try refreshing the page."}
                </p>
              ) : (
                <SuperadminLeadsJourneyClient analystGroups={analystGroupsClient} />
              )}
            </>
          )}
      </div>
    </div>
  );
}
