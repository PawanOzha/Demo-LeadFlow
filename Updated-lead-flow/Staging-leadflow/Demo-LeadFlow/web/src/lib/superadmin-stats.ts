import { parseDbDate } from "@/lib/analyst-ui";
import { dbQuery } from "@/lib/db/pool";
import { QualificationStatus, SalesStage, UserRole } from "@/lib/constants";
import { leadCreatedAtRange } from "@/lib/analyst-date-range";
import { resolveLeadCity, resolveLeadCountry } from "@/lib/phone-location";
import type { SuperadminLeadsWhereSql } from "@/lib/superadmin-leads-filters";
import { coerceMoney } from "@/lib/deal-money";

const ACTIVE_ROLES = [
  UserRole.LEAD_ANALYST,
  UserRole.ANALYST_TEAM_LEAD,
  UserRole.MAIN_TEAM_LEAD,
  UserRole.SALES_EXECUTIVE,
] as const;

export async function getSuperadminDashboardMetrics() {
  const [
    activeUsersRow,
    totalLeadsRow,
    qualifiedRow,
    notQualifiedRow,
    irrelevantRow,
    teamGroups,
    execGroups,
    closedRevenueSumRow,
    pipelineEstimateSumRow,
  ] = await Promise.all([
    dbQuery<{ c: string }>(
      `SELECT COUNT(*)::text as c FROM "User" WHERE role = ANY($1::text[])`,
      [ACTIVE_ROLES],
    ),
    dbQuery<{ c: string }>(`SELECT COUNT(*)::text as c FROM "Lead"`),
    dbQuery<{ c: string }>(
      `SELECT COUNT(*)::text as c FROM "Lead" WHERE "qualificationStatus" = $1`,
      [QualificationStatus.QUALIFIED],
    ),
    dbQuery<{ c: string }>(
      `SELECT COUNT(*)::text as c FROM "Lead" WHERE "qualificationStatus" = $1`,
      [QualificationStatus.NOT_QUALIFIED],
    ),
    dbQuery<{ c: string }>(
      `SELECT COUNT(*)::text as c FROM "Lead" WHERE "qualificationStatus" = $1`,
      [QualificationStatus.IRRELEVANT],
    ),
    dbQuery<{ teamId: string | null; c: string }>(
      `SELECT "teamId", COUNT(*)::text as c FROM "Lead" WHERE "teamId" IS NOT NULL GROUP BY "teamId"`,
    ),
    dbQuery<{ assignedSalesExecId: string | null; c: string }>(
      `SELECT "assignedSalesExecId", COUNT(*)::text as c FROM "Lead" WHERE "assignedSalesExecId" IS NOT NULL GROUP BY "assignedSalesExecId"`,
    ),
    dbQuery<{ s: string | null }>(
      `SELECT COALESCE(SUM("closedRevenue"), 0)::text AS s FROM "Lead" WHERE "salesStage" = $1 AND "closedRevenue" IS NOT NULL`,
      [SalesStage.CLOSED_WON],
    ),
    dbQuery<{ s: string | null }>(
      `SELECT COALESCE(SUM("estimatedDealValue"), 0)::text AS s FROM "Lead" WHERE "estimatedDealValue" IS NOT NULL`,
    ),
  ]);

  const activeUsers = Number(activeUsersRow[0]?.c ?? 0);
  const totalLeads = Number(totalLeadsRow[0]?.c ?? 0);
  const qualified = Number(qualifiedRow[0]?.c ?? 0);
  const notQualified = Number(notQualifiedRow[0]?.c ?? 0);
  const irrelevant = Number(irrelevantRow[0]?.c ?? 0);

  const teamIds = teamGroups
    .map((g) => g.teamId)
    .filter((id): id is string => id != null);
  const teams =
    teamIds.length > 0
      ? await dbQuery<{ id: string; name: string }>(
          `SELECT id, name FROM "Team" WHERE id = ANY($1::text[])`,
          [teamIds],
        )
      : [];
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  const leadsByTeam = teamGroups.map((g) => ({
    teamId: g.teamId as string,
    teamName: g.teamId ? teamName.get(g.teamId) ?? "Unknown team" : "—",
    count: Number(g.c),
  }));

  const execIds = execGroups
    .map((g) => g.assignedSalesExecId)
    .filter((id): id is string => id != null);
  const execs =
    execIds.length > 0
      ? await dbQuery<{ id: string; name: string; email: string }>(
          `SELECT id, name, email FROM "User" WHERE id = ANY($1::text[])`,
          [execIds],
        )
      : [];
  const execLabel = new Map(
    execs.map((u) => [u.id, `${u.name} (${u.email})`]),
  );

  const leadsBySalesExec = execGroups.map((g) => ({
    salesExecId: g.assignedSalesExecId as string,
    label:
      execLabel.get(g.assignedSalesExecId as string) ?? "Unknown executive",
    count: Number(g.c),
  }));

  const totalClosedRevenue = Number(closedRevenueSumRow[0]?.s ?? 0);
  const totalPipelineEstimate = Number(pipelineEstimateSumRow[0]?.s ?? 0);

  return {
    activeUsers,
    totalLeads,
    qualified,
    notQualified,
    irrelevant,
    leadsByTeam,
    leadsBySalesExec,
    totalClosedRevenue,
    totalPipelineEstimate,
  };
}

function monthKeyYmd(d: unknown): string {
  const v = parseDbDate(d);
  if (!v) return "unknown";
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}`;
}

function scoreHistogramBucket(s: number | null | undefined): string {
  if (s == null || Number.isNaN(s)) return "No score";
  if (s <= 20) return "0–20";
  if (s <= 40) return "21–40";
  if (s <= 60) return "41–60";
  if (s <= 80) return "61–80";
  return "81–100";
}

const SCORE_HIST_ORDER = [
  "0–20",
  "21–40",
  "41–60",
  "61–80",
  "81–100",
  "No score",
] as const;

type LeadReportRow = {
  id: string;
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  country: string | null;
  city: string | null;
  source: string;
  sourceWebsiteName: string | null;
  sourceMetaProfileName: string | null;
  notes: string | null;
  lostNotes: string | null;
  qualificationStatus: string;
  leadScore: number | null;
  salesStage: string;
  createdAt: Date;
  createdById: string;
  assignedSalesExecId: string | null;
  estimatedDealValue: unknown;
  closedRevenue: unknown;
  dealCurrency: string;
  cb_name: string | null;
  cb_email: string | null;
  se_name: string | null;
};

const REPORT_LEAD_ID_PAGE = 2500;
const REPORT_LEAD_ANY_CHUNK = 800;

const LEAD_REPORT_WIDE_COLUMNS = `
       l.id,
       l."leadName",
       l.phone,
       l."leadEmail",
       l.country,
       l.city,
       l.source,
       l."sourceWebsiteName",
       l."sourceMetaProfileName",
       l.notes,
       l."lostNotes",
       l."qualificationStatus",
       l."leadScore",
       l."salesStage",
       l."createdAt",
       l."createdById",
       l."assignedSalesExecId",
       l."estimatedDealValue",
       l."closedRevenue",
       l."dealCurrency",
       cb.name as cb_name,
       cb.email as cb_email,
       se.name as se_name`;

export async function getSuperadminReportAggregates(opts?: {
  from?: string | null;
  to?: string | null;
}) {
  const range = leadCreatedAtRange(
    opts?.from ?? undefined,
    opts?.to ?? undefined,
  );
  const rangeParams = range ? [range.gte, range.lte] : [];

  const [
    totalRow,
    qualifiedRow,
    notQualifiedRow,
    irrelevantRow,
    closedWonRow,
    closedLostRow,
    closedRevRow,
    pipeRow,
  ] = await Promise.all([
    dbQuery<{ c: string }>(
      range
        ? `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp`
        : `SELECT COUNT(*)::text AS c FROM "Lead" l`,
      rangeParams,
    ),
    dbQuery<{ c: string }>(
      range
        ? `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp AND l."qualificationStatus" = $3`
        : `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."qualificationStatus" = $1`,
      range
        ? [...rangeParams, QualificationStatus.QUALIFIED]
        : [QualificationStatus.QUALIFIED],
    ),
    dbQuery<{ c: string }>(
      range
        ? `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp AND l."qualificationStatus" = $3`
        : `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."qualificationStatus" = $1`,
      range
        ? [...rangeParams, QualificationStatus.NOT_QUALIFIED]
        : [QualificationStatus.NOT_QUALIFIED],
    ),
    dbQuery<{ c: string }>(
      range
        ? `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp AND l."qualificationStatus" = $3`
        : `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."qualificationStatus" = $1`,
      range
        ? [...rangeParams, QualificationStatus.IRRELEVANT]
        : [QualificationStatus.IRRELEVANT],
    ),
    dbQuery<{ c: string }>(
      range
        ? `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp AND l."salesStage" = $3`
        : `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."salesStage" = $1`,
      range ? [...rangeParams, SalesStage.CLOSED_WON] : [SalesStage.CLOSED_WON],
    ),
    dbQuery<{ c: string }>(
      range
        ? `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp AND l."salesStage" = $3`
        : `SELECT COUNT(*)::text AS c FROM "Lead" l WHERE l."salesStage" = $1`,
      range
        ? [...rangeParams, SalesStage.CLOSED_LOST]
        : [SalesStage.CLOSED_LOST],
    ),
    dbQuery<{ s: string | null }>(
      range
        ? `SELECT COALESCE(SUM(l."closedRevenue"), 0)::text AS s FROM "Lead" l WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp AND l."salesStage" = $3 AND l."closedRevenue" IS NOT NULL`
        : `SELECT COALESCE(SUM(l."closedRevenue"), 0)::text AS s FROM "Lead" l WHERE l."salesStage" = $1 AND l."closedRevenue" IS NOT NULL`,
      range
        ? [...rangeParams, SalesStage.CLOSED_WON]
        : [SalesStage.CLOSED_WON],
    ),
    dbQuery<{ s: string | null }>(
      range
        ? `SELECT COALESCE(SUM(l."estimatedDealValue"), 0)::text AS s FROM "Lead" l WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp AND l."estimatedDealValue" IS NOT NULL`
        : `SELECT COALESCE(SUM(l."estimatedDealValue"), 0)::text AS s FROM "Lead" l WHERE l."estimatedDealValue" IS NOT NULL`,
      rangeParams,
    ),
  ]);

  const total = Number(totalRow[0]?.c ?? 0);
  const qualified = Number(qualifiedRow[0]?.c ?? 0);
  const notQualified = Number(notQualifiedRow[0]?.c ?? 0);
  const irrelevant = Number(irrelevantRow[0]?.c ?? 0);
  const closedWon = Number(closedWonRow[0]?.c ?? 0);
  const closedLost = Number(closedLostRow[0]?.c ?? 0);
  const totalClosedRevenueInRange = Number(closedRevRow[0]?.s ?? 0);
  const totalEstimatedPipelineInRange = Number(pipeRow[0]?.s ?? 0);
  const closedTotal = closedWon + closedLost;

  const leadRows: LeadReportRow[] = [];
  if (total > 0) {
    let offset = 0;
    while (true) {
      const idRows = await dbQuery<{ id: string }>(
        range
          ? `SELECT l.id FROM "Lead" l WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp ORDER BY l."createdAt" ASC, l.id ASC LIMIT ($3)::bigint OFFSET ($4)::bigint`
          : `SELECT l.id FROM "Lead" l ORDER BY l."createdAt" ASC, l.id ASC LIMIT ($1)::bigint OFFSET ($2)::bigint`,
        range
          ? [...rangeParams, REPORT_LEAD_ID_PAGE, offset]
          : [REPORT_LEAD_ID_PAGE, offset],
      );
      if (idRows.length === 0) break;
      const ids = idRows.map((r) => r.id);
      for (let i = 0; i < ids.length; i += REPORT_LEAD_ANY_CHUNK) {
        const slice = ids.slice(i, i + REPORT_LEAD_ANY_CHUNK);
        const batch = await dbQuery<LeadReportRow>(
          `SELECT ${LEAD_REPORT_WIDE_COLUMNS}
           FROM "Lead" l
           LEFT JOIN "User" cb ON cb.id = l."createdById"
           LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
           WHERE l.id = ANY($1::text[])`,
          [slice],
        );
        const orderMap = new Map(slice.map((id, idx) => [id, idx]));
        batch.sort(
          (a, b) =>
            (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
        );
        leadRows.push(...batch);
      }
      offset += REPORT_LEAD_ID_PAGE;
      if (idRows.length < REPORT_LEAD_ID_PAGE) break;
    }
  }

  const leads = leadRows.map((l) => ({
    id: l.id,
    leadName: l.leadName,
    phone: l.phone,
    leadEmail: l.leadEmail,
    country: l.country,
    city: l.city,
    source: l.source,
    sourceWebsiteName: l.sourceWebsiteName,
    sourceMetaProfileName: l.sourceMetaProfileName,
    notes: l.notes,
    lostNotes: l.lostNotes,
    qualificationStatus: l.qualificationStatus,
    leadScore: l.leadScore,
    salesStage: l.salesStage,
    createdAt: l.createdAt,
    createdBy: {
      id: l.createdById,
      name: l.cb_name ?? "Unknown analyst",
      email: l.cb_email ?? "",
    },
    assignedSalesExec: l.assignedSalesExecId
      ? { id: l.assignedSalesExecId, name: l.se_name ?? "" }
      : null,
    estimatedDealValue: coerceMoney(l.estimatedDealValue),
    closedRevenue: coerceMoney(l.closedRevenue),
    dealCurrency: l.dealCurrency?.trim() || "USD",
  }));

  const byCountry = new Map<string, number>();
  const byCity = new Map<string, number>();
  const byScore = new Map<string, number>();
  const byMonth = new Map<string, number>();

  for (const l of leads) {
    const c = resolveLeadCountry(l.country, l.phone);
    byCountry.set(c, (byCountry.get(c) ?? 0) + 1);

    const city = resolveLeadCity(l.city);
    const cityKey = `${city} · ${c}`;
    byCity.set(cityKey, (byCity.get(cityKey) ?? 0) + 1);

    const sb = scoreHistogramBucket(l.leadScore);
    byScore.set(sb, (byScore.get(sb) ?? 0) + 1);

    const mk = monthKeyYmd(l.createdAt);
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + 1);
  }

  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const pctClosed = (n: number) =>
    closedTotal > 0 ? (n / closedTotal) * 100 : 0;

  return {
    total,
    qualified,
    notQualified,
    irrelevant,
    closedWon,
    closedLost,
    totalClosedRevenueInRange,
    totalEstimatedPipelineInRange,
    qualifiedRatio: pct(qualified),
    notQualifiedRatio: pct(notQualified),
    irrelevantRatio: pct(irrelevant),
    conversionRatio: pct(closedWon),
    winRateAmongClosed: pctClosed(closedWon),
    lostRateAmongClosed: pctClosed(closedLost),
    lostRatioOfAll: pct(closedLost),
    countryRows: [...byCountry.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({ country, count })),
    cityRows: [...byCity.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count })),
    scoreHistogram: SCORE_HIST_ORDER.map((label) => ({
      label,
      count: byScore.get(label) ?? 0,
    })),
    createdByMonth: [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, count]) => ({ label: ym, count })),
    countryHistogram: [...byCountry.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([country, count]) => ({ label: country, count })),
    leads,
  };
}

type LeadDbRow = {
  id: string;
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  country: string | null;
  city: string | null;
  source: string;
  sourceWebsiteName: string | null;
  sourceMetaProfileName: string | null;
  notes: string | null;
  lostNotes: string | null;
  qualificationStatus: string;
  leadScore: number | null;
  salesStage: string;
  createdById: string;
  teamId: string | null;
  assignedMainTeamLeadId: string | null;
  assignedSalesExecId: string | null;
  execAssignedAt: Date | null;
  execDeadlineAt: Date | null;
  closedAt: Date | null;
  estimatedDealValue: unknown;
  closedRevenue: unknown;
  dealCurrency: string;
  internalReassignCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type JourneyLead = LeadDbRow & {
  createdBy: { id: string; name: string; email: string };
  team: { name: string } | null;
  assignedMainTeamLead: { name: string; email: string } | null;
  assignedSalesExec: { name: string; email: string } | null;
  handoffLogs: {
    id: string;
    createdAt: Date;
    action: string;
    detail: string | null;
    actor: { name: string; email: string; role: string } | null;
  }[];
};

const LEAD_JOURNEY_COLUMNS = `
           id,
           "leadName",
           phone,
           "leadEmail",
           country,
           city,
           source,
           "sourceWebsiteName",
           "sourceMetaProfileName",
           notes,
           "lostNotes",
           "qualificationStatus",
           "leadScore",
           "salesStage",
           "createdById",
           "teamId",
           "assignedMainTeamLeadId",
           "assignedSalesExecId",
           "execAssignedAt",
           "execDeadlineAt",
           "closedAt",
           "estimatedDealValue",
           "closedRevenue",
           "dealCurrency",
           "internalReassignCount",
           "createdAt",
           "updatedAt"`;

/** Narrow query + fetch-by-id: hosted exec_sql often returns [] for wide SELECT … LIMIT … OFFSET while COUNT(*) works. */
const FETCH_BY_ID_CHUNK = 800;

export async function getSuperadminLeadsWithJourney(
  where?: SuperadminLeadsWhereSql,
  paging?: { limit?: number; offset?: number },
) {
  const clause = where?.clause ?? "TRUE";
  const baseParams = where?.params ?? [];
  const limit = Math.max(1, paging?.limit ?? 0);
  const offset = Math.max(0, paging?.offset ?? 0);
  const hasPaging = Boolean(paging?.limit);

  let leadRows: LeadDbRow[];

  if (hasPaging) {
    const limIdx = baseParams.length + 1;
    const offIdx = baseParams.length + 2;
    const idRows = await dbQuery<{ id: string }>(
      `SELECT id FROM "Lead" WHERE ${clause} ORDER BY "updatedAt" DESC, id DESC LIMIT ($${limIdx})::bigint OFFSET ($${offIdx})::bigint`,
      [...baseParams, limit, offset],
    );
    const ids = idRows.map((r) => r.id);
    if (ids.length === 0) {
      leadRows = [];
    } else {
      const chunks: LeadDbRow[] = [];
      for (let i = 0; i < ids.length; i += FETCH_BY_ID_CHUNK) {
        const slice = ids.slice(i, i + FETCH_BY_ID_CHUNK);
        const batch = await dbQuery<LeadDbRow>(
          `SELECT ${LEAD_JOURNEY_COLUMNS}
           FROM "Lead"
           WHERE id = ANY($1::text[])`,
          [slice],
        );
        chunks.push(...batch);
      }
      const order = new Map(ids.map((id, idx) => [id, idx]));
      chunks.sort(
        (a, b) =>
          (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
      );
      leadRows = chunks;
    }
  } else {
    leadRows = await dbQuery<LeadDbRow>(
      `SELECT ${LEAD_JOURNEY_COLUMNS}
         FROM "Lead"
         WHERE ${clause}
         ORDER BY "updatedAt" DESC, id DESC`,
      baseParams,
    );
  }

  if (leadRows.length === 0) {
    return {
      qualTotals: { qualified: 0, notQualified: 0, irrelevant: 0 },
      analystGroups: [] as { analyst: { id: string; name: string; email: string }; leads: JourneyLead[] }[],
    };
  }

  const userIds = new Set<string>();
  const teamIds = new Set<string>();
  for (const l of leadRows) {
    userIds.add(l.createdById);
    if (l.teamId) teamIds.add(l.teamId);
    if (l.assignedMainTeamLeadId) userIds.add(l.assignedMainTeamLeadId);
    if (l.assignedSalesExecId) userIds.add(l.assignedSalesExecId);
  }

  const users = await dbQuery<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>(
    `SELECT id, name, email, role FROM "User" WHERE id = ANY($1::text[])`,
    [Array.from(userIds)],
  );
  const userMap = new Map(users.map((u) => [u.id, u]));

  const teams =
    teamIds.size > 0
      ? await dbQuery<{ id: string; name: string }>(
          `SELECT id, name FROM "Team" WHERE id = ANY($1::text[])`,
          [Array.from(teamIds)],
        )
      : [];
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const leadIds = leadRows.map((l) => l.id);
  const logRows = await dbQuery<{
    id: string;
    leadId: string;
    createdAt: Date;
    action: string;
    detail: string | null;
    actorId: string | null;
  }>(
    `SELECT id, "leadId", "createdAt", action, detail, "actorId" FROM "LeadHandoffLog"
     WHERE "leadId" = ANY($1::text[]) ORDER BY "createdAt" ASC`,
    [leadIds],
  );

  for (const log of logRows) {
    if (log.actorId) userIds.add(log.actorId);
  }
  const missingActorIds = [...new Set(logRows.map((l) => l.actorId).filter(Boolean))].filter(
    (id) => id && !userMap.has(id),
  ) as string[];
  if (missingActorIds.length > 0) {
    const more = await dbQuery<{
      id: string;
      name: string;
      email: string;
      role: string;
    }>(
      `SELECT id, name, email, role FROM "User" WHERE id = ANY($1::text[])`,
      [missingActorIds],
    );
    for (const u of more) userMap.set(u.id, u);
  }

  const logsByLead = new Map<string, typeof logRows>();
  for (const log of logRows) {
    const list = logsByLead.get(log.leadId) ?? [];
    list.push(log);
    logsByLead.set(log.leadId, list);
  }

  const enriched: JourneyLead[] = leadRows.map((l) => {
    const cb = userMap.get(l.createdById);
    const mtl = l.assignedMainTeamLeadId
      ? userMap.get(l.assignedMainTeamLeadId)
      : null;
    const se = l.assignedSalesExecId
      ? userMap.get(l.assignedSalesExecId)
      : null;
    const team = l.teamId ? teamMap.get(l.teamId) : null;

    const rawLogs = logsByLead.get(l.id) ?? [];
    const handoffLogs = rawLogs.map((h) => {
      const actor = h.actorId ? userMap.get(h.actorId) : null;
      return {
        id: h.id,
        createdAt: h.createdAt,
        action: h.action,
        detail: h.detail,
        actor: actor
          ? {
              name: actor.name,
              email: actor.email,
              role: actor.role,
            }
          : null,
      };
    });

    return {
      ...l,
      createdBy: cb
        ? { id: cb.id, name: cb.name, email: cb.email }
        : { id: l.createdById, name: "?", email: "?" },
      team: team ? { name: team.name } : null,
      assignedMainTeamLead: mtl
        ? { name: mtl.name, email: mtl.email }
        : null,
      assignedSalesExec: se
        ? { name: se.name, email: se.email }
        : null,
      handoffLogs,
    };
  });

  const qualTotals = {
    qualified: enriched.filter(
      (l) => l.qualificationStatus === QualificationStatus.QUALIFIED,
    ).length,
    notQualified: enriched.filter(
      (l) => l.qualificationStatus === QualificationStatus.NOT_QUALIFIED,
    ).length,
    irrelevant: enriched.filter(
      (l) => l.qualificationStatus === QualificationStatus.IRRELEVANT,
    ).length,
  };

  const byAnalyst = new Map<string, JourneyLead[]>();
  for (const l of enriched) {
    const id = l.createdById;
    if (!byAnalyst.has(id)) byAnalyst.set(id, []);
    byAnalyst.get(id)!.push(l);
  }

  const analystGroups = [...byAnalyst.values()]
    .map((list) => ({
      analyst: list[0]!.createdBy,
      leads: list,
    }))
    .sort((a, b) => a.analyst.name.localeCompare(b.analyst.name));

  return { qualTotals, analystGroups };
}
