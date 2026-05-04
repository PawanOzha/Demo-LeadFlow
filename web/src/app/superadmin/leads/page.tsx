import type { Metadata } from "next";
import { SuperadminLeadsFiltersBar } from "@/components/superadmin/superadmin-leads-filters";
import { QualificationStatus, SalesStage, UserRole } from "@/lib/constants";
import { coerceMoney } from "@/lib/deal-money";
import { getSuperadminLeadsWithJourney } from "@/lib/superadmin-stats";
import {
  buildSuperadminLeadsWhereSql,
  parseSuperadminLeadsSearchParams,
  superadminLeadsFilterSummary,
} from "@/lib/superadmin-leads-filters";
import { dbQuery } from "@/lib/db/pool";
import { SuperadminLeadsJourneyClient } from "@/components/superadmin/superadmin-leads-journey-client";
import { toRscSerializableDashboardExport } from "@/lib/dashboard-export-types";
import { flattenSuperadminJourneyGroupsForExport } from "@/lib/superadmin-leads-export-map";
import { buildSuperadminLeadsExportPayload } from "@/lib/portal-all-leads-export-payloads";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import { timedServerBlock } from "@/lib/server/log";

export const metadata: Metadata = {
  title: "Leads · Superadmin",
};

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
  const parsed = parseSuperadminLeadsSearchParams(sp);
  const where = buildSuperadminLeadsWhereSql(parsed);
  const page = Math.max(1, parsed.page);
  const perPage = parsed.perPage;
  const offset = (page - 1) * perPage;

  const [
    teams,
    execs,
    analysts,
    countTotalRows,
    countQualifiedRows,
    countNotQualifiedRows,
    countIrrelevantRows,
    paged,
    exportPack,
    duplicateRows,
    closedRevFiltered,
    pipelineEstFiltered,
  ] = await timedServerBlock("route:/superadmin/leads page:queries", () =>
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
        // One column `c` per query — same shape as superadmin dashboard metrics (reliable via exec_sql).
        dbQuery<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM "Lead" WHERE ${where.clause}`,
          where.params,
        ),
        dbQuery<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM "Lead" WHERE ${where.clause} AND "qualificationStatus" = $${where.params.length + 1}`,
          [...where.params, QualificationStatus.QUALIFIED],
        ),
        dbQuery<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM "Lead" WHERE ${where.clause} AND "qualificationStatus" = $${where.params.length + 1}`,
          [...where.params, QualificationStatus.NOT_QUALIFIED],
        ),
        dbQuery<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM "Lead" WHERE ${where.clause} AND "qualificationStatus" = $${where.params.length + 1}`,
          [...where.params, QualificationStatus.IRRELEVANT],
        ),
        getSuperadminLeadsWithJourney(where, { limit: perPage, offset }),
        getSuperadminLeadsWithJourney(where, {
          limit: PORTAL_LEADS_EXPORT_ROW_CAP,
          offset: 0,
        }),
        dbQuery<{ lead_id: string; dup_count: string }>(
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
        ),
        dbQuery<{ s: string | null }>(
          `SELECT COALESCE(SUM("closedRevenue"), 0)::text AS s FROM "Lead" WHERE ${where.clause} AND "salesStage" = $${where.params.length + 1} AND "closedRevenue" IS NOT NULL`,
          [...where.params, SalesStage.CLOSED_WON],
        ),
        dbQuery<{ s: string | null }>(
          `SELECT COALESCE(SUM("estimatedDealValue"), 0)::text AS s FROM "Lead" WHERE ${where.clause} AND "estimatedDealValue" IS NOT NULL`,
          where.params,
        ),
      ]),
    );
  const totalCount = Number(countTotalRows[0]?.c ?? 0);
  const qualTotals = {
    qualified: Number(countQualifiedRows[0]?.c ?? 0),
    notQualified: Number(countNotQualifiedRows[0]?.c ?? 0),
    irrelevant: Number(countIrrelevantRows[0]?.c ?? 0),
  };
  const qualSumKnownStatuses =
    qualTotals.qualified + qualTotals.notQualified + qualTotals.irrelevant;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const analystGroups = paged.analystGroups;
  const filteredClosedRevenueTotal = Number(closedRevFiltered[0]?.s ?? 0);
  const filteredPipelineEstimateTotal = Number(pipelineEstFiltered[0]?.s ?? 0);

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
  const superadminExportRows = flattenSuperadminJourneyGroupsForExport(
    exportPack.analystGroups,
  );
  const superadminExportPayload = buildSuperadminLeadsExportPayload(
    superadminExportRows,
    {
      filterSummary,
      rangeTotalCount: totalCount,
      exportRowCount: superadminExportRows.length,
    },
  );

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

  const filtersKey = `${parsed.from ?? ""}|${parsed.to ?? ""}|${parsed.q ?? ""}|${parsed.status}|${parsed.analystId ?? ""}|${parsed.teamId ?? ""}|${parsed.execId ?? ""}|${parsed.perPage}|${parsed.page}`;
  const qp = new URLSearchParams();
  if (parsed.from) qp.set("from", parsed.from);
  if (parsed.to) qp.set("to", parsed.to);
  if (parsed.q) qp.set("q", parsed.q);
  if (parsed.status) qp.set("status", parsed.status);
  if (parsed.analystId) qp.set("analystId", parsed.analystId);
  if (parsed.teamId) qp.set("teamId", parsed.teamId);
  if (parsed.execId) qp.set("execId", parsed.execId);
  qp.set("perPage", String(perPage));
  const prevHref =
    page > 1
      ? `/superadmin/leads?${new URLSearchParams({
          ...Object.fromEntries(qp.entries()),
          page: String(page - 1),
        }).toString()}`
      : null;
  const nextHref =
    page < totalPages
      ? `/superadmin/leads?${new URLSearchParams({
          ...Object.fromEntries(qp.entries()),
          page: String(page + 1),
        }).toString()}`
      : null;

  return (
    <div className="space-y-12 pb-10">
      <SuperadminLeadsFiltersBar
        key={filtersKey}
        initial={parsed}
        analysts={analysts}
        teams={teams}
        execs={execs}
      />

      <div className="space-y-2 rounded-xl border border-lf-border bg-lf-surface px-4 py-3 text-[13px] text-lf-muted shadow-sm sm:px-5">
        <p className="font-medium text-lf-text-secondary">Current view</p>
        <p>{filterSummary}</p>
        <p className="tabular-nums text-lf-text">
          <span className="font-semibold">{totalCount.toLocaleString()}</span>{" "}
          lead{totalCount === 1 ? "" : "s"} match these filters (same scope as
          the table and revenue totals).
        </p>
        {totalCount > 0 && qualSumKnownStatuses < totalCount ? (
          <p className="text-[12px] text-lf-warning">
            {(
              totalCount - qualSumKnownStatuses
            ).toLocaleString()}{" "}
            lead(s) have a qualification status other than QUALIFIED /
            NOT_QUALIFIED / IRRELEVANT — those appear in the total above but not
            in the three breakdown cards.
          </p>
        ) : null}
        {totalCount === 0 ? (
          <p className="text-[12px] text-lf-muted">
            If you expect data here, clear date/search/analyst/team/exec filters
            or confirm this app&apos;s Supabase project matches the database
            where you see rows (same{" "}
            <code className="rounded bg-lf-bg px-1 text-[11px]">
              NEXT_PUBLIC_SUPABASE_URL
            </code>
            ).
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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

      <SuperadminLeadsJourneyClient
        analystGroups={analystGroupsClient}
        pagination={{
          totalCount,
          offset,
          perPage,
          page,
          totalPages,
          prevHref,
          nextHref,
        }}
        exportPayload={toRscSerializableDashboardExport(superadminExportPayload)}
        exportDescription="PDF, Excel, or CSV for filtered leads (subject to the export row limit in the download summary)."
      />
    </div>
  );
}
