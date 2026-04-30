import { parseDbDate } from "@/lib/analyst-ui";
import { dbQuery } from "@/lib/db/pool";
import { QualificationStatus, SalesStage, UserRole } from "@/lib/constants";
import { leadCreatedAtRange } from "@/lib/analyst-date-range";
import { resolveLeadCity, resolveLeadCountry } from "@/lib/phone-location";
import type { SuperadminLeadsWhereSql } from "@/lib/superadmin-leads-filters";

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

  return {
    activeUsers,
    totalLeads,
    qualified,
    notQualified,
    irrelevant,
    leadsByTeam,
    leadsBySalesExec,
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
  cb_name: string;
  cb_email: string;
  se_name: string | null;
};

export async function getSuperadminReportAggregates(opts?: {
  from?: string | null;
  to?: string | null;
}) {
  const range = leadCreatedAtRange(
    opts?.from ?? undefined,
    opts?.to ?? undefined,
  );
  const rangeSql = range
    ? `WHERE l."createdAt" >= $1::timestamp AND l."createdAt" <= $2::timestamp`
    : "";
  const rangeParams = range ? [range.gte, range.lte] : [];

  const leadRows = await dbQuery<LeadReportRow>(
    `SELECT l.*, cb.name as cb_name, cb.email as cb_email, se.name as se_name
     FROM "Lead" l
     INNER JOIN "User" cb ON cb.id = l."createdById"
     LEFT JOIN "User" se ON se.id = l."assignedSalesExecId"
     ${rangeSql}
     ORDER BY l."createdAt" ASC`,
    rangeParams,
  );

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
      name: l.cb_name,
      email: l.cb_email,
    },
    assignedSalesExec: l.assignedSalesExecId
      ? { id: l.assignedSalesExecId, name: l.se_name ?? "" }
      : null,
  }));

  let closedWon = 0;
  let closedLost = 0;
  let qualified = 0;
  let notQualified = 0;
  let irrelevant = 0;
  const byCountry = new Map<string, number>();
  const byCity = new Map<string, number>();
  const byScore = new Map<string, number>();
  const byMonth = new Map<string, number>();

  for (const l of leads) {
    if (l.qualificationStatus === QualificationStatus.QUALIFIED) qualified++;
    else if (l.qualificationStatus === QualificationStatus.NOT_QUALIFIED)
      notQualified++;
    else if (l.qualificationStatus === QualificationStatus.IRRELEVANT)
      irrelevant++;

    if (l.salesStage === SalesStage.CLOSED_WON) closedWon++;
    else if (l.salesStage === SalesStage.CLOSED_LOST) closedLost++;

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

  const total = leads.length;
  const closedTotal = closedWon + closedLost;

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

export async function getSuperadminLeadsWithJourney(
  where?: SuperadminLeadsWhereSql,
  paging?: { limit?: number; offset?: number },
) {
  const clause = where?.clause ?? "TRUE";
  const baseParams = where?.params ?? [];
  const limit = Math.max(1, paging?.limit ?? 0);
  const offset = Math.max(0, paging?.offset ?? 0);
  const hasPaging = Boolean(paging?.limit);

  const leadRows = await dbQuery<LeadDbRow>(
    hasPaging
      ? `SELECT * FROM "Lead" WHERE ${clause} ORDER BY "updatedAt" DESC LIMIT ($${baseParams.length + 1})::bigint OFFSET ($${baseParams.length + 2})::bigint`
      : `SELECT * FROM "Lead" WHERE ${clause} ORDER BY "updatedAt" DESC`,
    hasPaging ? [...baseParams, limit, offset] : baseParams,
  );

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
