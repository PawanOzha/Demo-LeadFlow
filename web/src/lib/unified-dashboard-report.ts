import {
  type DashboardExportPayload,
  toRscSerializableDashboardExport,
} from "@/lib/dashboard-export-types";
import { buildAnalystAnalyticsReportPayload } from "@/lib/analyst-analytics-payload";
import {
  buildAnalystCityRows,
  buildCountryQualRows,
  countryLabelForIso,
  leadPhoneCountryIso,
  type CountryQualRow,
} from "@/lib/leads-by-country-qual";
import {
  formatAnalystDate,
  parseDbDate,
  pipelineNoteForLead,
  pipelinePillForLead,
  sourcePillText,
} from "@/lib/analyst-ui";
import { analystFacingSalesLabel } from "@/lib/sales-stage-labels";
import { QualificationStatus, SalesStage } from "@/lib/constants";
import { extractQualificationReason } from "@/lib/qualification-reasons";

export type UnifiedPortalKind =
  | "lead_analyst"
  | "analyst_team_lead"
  | "main_team_lead"
  | "sales_executive"
  | "superadmin";

/** Normalized lead row for reports (map each portal’s lead row to this). */
export type UnifiedLeadRow = {
  id: string;
  leadName: string | null;
  source: string;
  /** Site / brand when source is web or forms */
  sourceWebsiteName: string | null;
  /** Meta page or profile when source is Meta / WhatsApp */
  sourceMetaProfileName: string | null;
  qualificationStatus: string;
  salesStage: string;
  leadScore: number | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  createdAt: Date;
  notes: string | null;
  /** Sales executive’s reason when closed lost */
  lostNotes: string | null;
  createdById: string;
  createdByEmail: string | null;
  createdByName: string;
  assignedSalesExecId: string | null;
  assignedRepName: string | null;
};

/** Per lead analyst (creator): qualification mix. */
export type LeadAnalystQualBreakdownRow = {
  label: string;
  total: number;
  qualified: number;
  notQ: number;
  irrelevant: number;
};

/** Per sales executive: assigned volume and closed outcomes. */
export type SalesExecOutcomeRow = {
  label: string;
  assignedTotal: number;
  withRepOpen: number;
  closedWon: number;
  closedLost: number;
};

export type QualificationReasonRow = {
  status: string;
  reason: string;
  count: number;
};

export function buildLeadAnalystQualBreakdown(
  leads: UnifiedLeadRow[],
): LeadAnalystQualBreakdownRow[] {
  type Agg = { label: string; q: number; nq: number; ir: number };
  const byId = new Map<string, Agg>();
  for (const l of leads) {
    const id = l.createdById;
    let row = byId.get(id);
    if (!row) {
      const email = l.createdByEmail?.trim();
      const label = email
        ? `${l.createdByName} (${email})`
        : l.createdByName;
      row = { label, q: 0, nq: 0, ir: 0 };
      byId.set(id, row);
    }
    if (l.qualificationStatus === QualificationStatus.QUALIFIED) row.q += 1;
    else if (l.qualificationStatus === QualificationStatus.NOT_QUALIFIED)
      row.nq += 1;
    else if (l.qualificationStatus === QualificationStatus.IRRELEVANT) row.ir += 1;
  }
  return [...byId.values()]
    .map((r) => ({
      label: r.label,
      total: r.q + r.nq + r.ir,
      qualified: r.q,
      notQ: r.nq,
      irrelevant: r.ir,
    }))
    .sort((a, b) => b.total - a.total);
}

export function buildSalesExecOutcomeRows(
  leads: UnifiedLeadRow[],
): SalesExecOutcomeRow[] {
  type Agg = {
    label: string;
    assignedTotal: number;
    withRepOpen: number;
    closedWon: number;
    closedLost: number;
  };
  const byId = new Map<string | null, Agg>();

  for (const l of leads) {
    const id = l.assignedSalesExecId;
    const label =
      id == null
        ? "Unassigned (no sales executive)"
        : (l.assignedRepName ?? "Unknown executive");

    let row = byId.get(id);
    if (!row) {
      row = {
        label,
        assignedTotal: 0,
        withRepOpen: 0,
        closedWon: 0,
        closedLost: 0,
      };
      byId.set(id, row);
    }

    row.assignedTotal += 1;
    if (l.salesStage === SalesStage.WITH_EXECUTIVE) row.withRepOpen += 1;
    else if (l.salesStage === SalesStage.CLOSED_WON) row.closedWon += 1;
    else if (l.salesStage === SalesStage.CLOSED_LOST) row.closedLost += 1;
  }

  const rows = [...byId.entries()].map(([, v]) => v);
  const unassignedRows = rows.filter((r) =>
    r.label.startsWith("Unassigned"),
  );
  const rest = rows
    .filter((r) => !r.label.startsWith("Unassigned"))
    .sort((a, b) => b.assignedTotal - a.assignedTotal);
  return [...rest, ...unassignedRows];
}

/** Won conversion within a bucket (won ÷ leads in bucket × 100). */
export type ConversionDimRow = {
  label: string;
  total: number;
  won: number;
  conversionPct: number;
};

/** Single bucket per logical label (trim + collapse spaces) to avoid duplicate rows. */
function bucketDimLabel(v: string | null | undefined): string {
  const t = v?.trim().replace(/\s+/g, " ");
  return t ? t : "—";
}

function buildConversionRows(
  leads: UnifiedLeadRow[],
  keyFn: (l: UnifiedLeadRow) => string,
): ConversionDimRow[] {
  const agg = new Map<string, { total: number; won: number }>();
  for (const l of leads) {
    const key = keyFn(l);
    const row = agg.get(key) ?? { total: 0, won: 0 };
    row.total += 1;
    if (l.salesStage === SalesStage.CLOSED_WON) row.won += 1;
    agg.set(key, row);
  }
  return [...agg.entries()]
    .map(([label, { total, won }]) => ({
      label,
      total,
      won,
      conversionPct: total ? (won / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export type UnifiedPortalMeta = {
  kind: UnifiedPortalKind;
  rangeLabel: string;
  generatedAt: string;
  fileNamePrefix: string;
  reportTitle: string;
  reportSubtitle: string;
  analystName?: string;
  analystEmail?: string;
  analystCount?: number;
  teamCount?: number;
  teamName?: string;
  execCount?: number;
};

const STAGE_ORDER = [
  SalesStage.PRE_SALES,
  SalesStage.WITH_TEAM_LEAD,
  SalesStage.WITH_EXECUTIVE,
  SalesStage.CLOSED_WON,
  SalesStage.CLOSED_LOST,
] as const;

export type UnifiedDashboardViewModel = {
  meta: UnifiedPortalMeta;
  exportPayload: DashboardExportPayload;
  total: number;
  qualified: number;
  notQ: number;
  irrelevant: number;
  qualRate: number;
  closedWon: number;
  closedLost: number;
  routed: number;
  withExec: number;
  beyondPreSalesQualified: number;
  sourceEntries: [string, number][];
  maxSource: number;
  countryRows: CountryQualRow[];
  cityRows: ReturnType<typeof buildAnalystCityRows>;
  stageEntries: { stageKey: string; label: string; count: number }[];
  maxStageBar: number;
  qualInsightRows: {
    label: string;
    count: number;
    pct: number;
    barClass: string;
  }[];
  maxQualBar: number;
  scoreBuckets: { label: string; count: number }[];
  pipelineInProgress: number;
  atlPassed: {
    qualifiedPassed: number;
    qualifiedInternal: number;
    passedPct: number;
    passedWithTl: number;
    passedWithExec: number;
    passedWon: number;
    passedLost: number;
  } | null;
  recent: UnifiedLeadRow[];
  pipelineQualified: UnifiedLeadRow[];
  /** All leads in scope (for full snapshot table). */
  allLeads: UnifiedLeadRow[];
  conversionByCountry: ConversionDimRow[];
  conversionByWebsite: ConversionDimRow[];
  conversionByProfile: ConversionDimRow[];
  conversionBySource: ConversionDimRow[];
  leadAnalystBreakdown: LeadAnalystQualBreakdownRow[];
  salesExecOutcomes: SalesExecOutcomeRow[];
  qualificationReasonRows: QualificationReasonRow[];
};

function leadForAnalytics(l: UnifiedLeadRow) {
  return {
    source: l.source,
    qualificationStatus: l.qualificationStatus,
    salesStage: l.salesStage,
    leadScore: l.leadScore,
    phone: l.phone,
    country: l.country,
    city: l.city,
  };
}

/** pg may return int8/numeric as bigint; mixing bigint with number throws in score buckets. */
function coerceLeadScoreForRow(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeUnifiedLeadRow(l: UnifiedLeadRow): UnifiedLeadRow {
  const createdAt = parseDbDate(l.createdAt) ?? new Date(0);
  return {
    ...l,
    createdAt,
    leadScore: coerceLeadScoreForRow(l.leadScore),
  };
}

export function buildUnifiedDashboardViewModel(
  inputLeads: UnifiedLeadRow[],
  meta: UnifiedPortalMeta,
): UnifiedDashboardViewModel {
  const leads = inputLeads.map(normalizeUnifiedLeadRow);
  const total = leads.length;
  const qualified = leads.filter(
    (l) => l.qualificationStatus === QualificationStatus.QUALIFIED,
  ).length;
  const notQ = leads.filter(
    (l) => l.qualificationStatus === QualificationStatus.NOT_QUALIFIED,
  ).length;
  const irrelevant = leads.filter(
    (l) => l.qualificationStatus === QualificationStatus.IRRELEVANT,
  ).length;
  const qualRate = total ? Math.round((qualified / total) * 100) : 0;

  const closedWon = leads.filter(
    (l) => l.salesStage === SalesStage.CLOSED_WON,
  ).length;
  const closedLost = leads.filter(
    (l) => l.salesStage === SalesStage.CLOSED_LOST,
  ).length;
  const withExec = leads.filter(
    (l) => l.salesStage === SalesStage.WITH_EXECUTIVE,
  ).length;
  const routed = leads.filter(
    (l) =>
      l.salesStage === SalesStage.WITH_TEAM_LEAD ||
      l.salesStage === SalesStage.WITH_EXECUTIVE ||
      l.salesStage === SalesStage.CLOSED_WON ||
      l.salesStage === SalesStage.CLOSED_LOST,
  ).length;

  const qualifiedPassed = leads.filter(
    (l) =>
      l.qualificationStatus === QualificationStatus.QUALIFIED &&
      l.salesStage !== SalesStage.PRE_SALES,
  );
  const qualifiedInternal = leads.filter(
    (l) =>
      l.qualificationStatus === QualificationStatus.QUALIFIED &&
      l.salesStage === SalesStage.PRE_SALES,
  );
  const beyondPreSalesQualified = qualifiedPassed.length;

  const passedPct = qualified
    ? Math.round((qualifiedPassed.length / qualified) * 100)
    : 0;
  const passedWithTl = qualifiedPassed.filter(
    (l) => l.salesStage === SalesStage.WITH_TEAM_LEAD,
  ).length;
  const passedWithExec = qualifiedPassed.filter(
    (l) => l.salesStage === SalesStage.WITH_EXECUTIVE,
  ).length;
  const passedWon = qualifiedPassed.filter(
    (l) => l.salesStage === SalesStage.CLOSED_WON,
  ).length;
  const passedLost = qualifiedPassed.filter(
    (l) => l.salesStage === SalesStage.CLOSED_LOST,
  ).length;

  const bySource = new Map<string, number>();
  for (const l of leads) {
    const key = bucketDimLabel(l.source);
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }
  const sourceEntries = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
  const maxSource = sourceEntries[0]?.[1] ?? 1;

  const conversionByCountry = buildConversionRows(leads, (l) =>
    countryLabelForIso(leadPhoneCountryIso(l.phone)),
  );
  const conversionByWebsite = buildConversionRows(leads, (l) =>
    bucketDimLabel(l.sourceWebsiteName),
  );
  const conversionByProfile = buildConversionRows(leads, (l) =>
    bucketDimLabel(l.sourceMetaProfileName),
  );
  const conversionBySource = buildConversionRows(leads, (l) =>
    bucketDimLabel(l.source),
  );

  const leadAnalystBreakdown = buildLeadAnalystQualBreakdown(leads);
  const salesExecOutcomes = buildSalesExecOutcomeRows(leads);
  const byQualificationReason = new Map<string, number>();
  for (const l of leads) {
    const reason = extractQualificationReason(l.notes);
    if (!reason) continue;
    if (
      l.qualificationStatus !== QualificationStatus.NOT_QUALIFIED &&
      l.qualificationStatus !== QualificationStatus.IRRELEVANT
    ) {
      continue;
    }
    const key = `${l.qualificationStatus}:::${reason}`;
    byQualificationReason.set(key, (byQualificationReason.get(key) ?? 0) + 1);
  }
  const qualificationReasonRows: QualificationReasonRow[] = [
    ...byQualificationReason.entries(),
  ]
    .map(([key, count]) => {
      const sep = ":::";
      const i = key.indexOf(sep);
      const status = i === -1 ? key : key.slice(0, i);
      const reason = i === -1 ? "" : key.slice(i + sep.length);
      return { status, reason, count };
    })
    .sort((a, b) => {
      const byCount = b.count - a.count;
      if (byCount !== 0) return byCount;
      return String(a.reason ?? "").localeCompare(String(b.reason ?? ""));
    });

  const countryRows = buildCountryQualRows(leads);
  const cityRows = buildAnalystCityRows(leads);

  const byStageCount = new Map<string, number>();
  for (const st of STAGE_ORDER) byStageCount.set(st, 0);
  for (const l of leads) {
    byStageCount.set(
      l.salesStage,
      (byStageCount.get(l.salesStage) ?? 0) + 1,
    );
  }
  const stageEntries = STAGE_ORDER.map((st) => ({
    stageKey: st,
    label: analystFacingSalesLabel(st),
    count: byStageCount.get(st) ?? 0,
  }));
  const maxStageBar = Math.max(...stageEntries.map((s) => s.count), 1);

  const qualInsightRows = (
    [
      ["Qualified", qualified, "bg-lf-success"],
      ["Not qualified", notQ, "bg-lf-warning"],
      ["Irrelevant", irrelevant, "bg-lf-subtle"],
    ] as const
  ).map(([label, count, barClass]) => ({
    label,
    count,
    barClass,
    pct: total ? Math.round((count / total) * 100) : 0,
  }));
  const maxQualBar = Math.max(qualified, notQ, irrelevant, 1);

  const analytics = buildAnalystAnalyticsReportPayload(
    leads.map(leadForAnalytics),
    {
      rangeLabel: meta.rangeLabel,
      analystName: meta.analystName ?? "—",
      analystEmail: meta.analystEmail ?? "—",
      title: meta.reportTitle,
      subtitle: meta.reportSubtitle,
    },
  );

  const scoreBuckets = analytics.scoreBuckets;

  const pipelineQualified = leads.filter(
    (l) => l.qualificationStatus === QualificationStatus.QUALIFIED,
  );
  const recent = leads.slice(0, 6);

  const exportPayload = toRscSerializableDashboardExport(
    buildUnifiedExportPayload(
      leads,
      meta,
      analytics,
      {
        total,
        qualified,
        notQ,
        irrelevant,
        qualRate,
        closedWon,
        closedLost,
        inProgress: leads.filter(
          (l) => l.salesStage === SalesStage.WITH_EXECUTIVE,
        ).length,
        assigned: leads.filter(
          (l) => l.salesStage === SalesStage.WITH_TEAM_LEAD,
        ).length,
        routed,
        withExec,
        qualifiedPassed: qualifiedPassed.length,
        qualifiedInternal: qualifiedInternal.length,
        passedPct,
        passedWithTl,
        passedWithExec,
        passedWon,
        passedLost,
      },
      countryRows,
      cityRows,
      stageEntries,
      qualInsightRows,
      sourceEntries,
      conversionByCountry,
      conversionByWebsite,
      conversionByProfile,
      conversionBySource,
      leadAnalystBreakdown,
      salesExecOutcomes,
      qualificationReasonRows,
    ),
  );

  const showQualifiedPassedBlock =
    meta.kind === "analyst_team_lead" || meta.kind === "superadmin";
  const atlPassed = showQualifiedPassedBlock
    ? {
        qualifiedPassed: qualifiedPassed.length,
        qualifiedInternal: qualifiedInternal.length,
        passedPct,
        passedWithTl,
        passedWithExec,
        passedWon,
        passedLost,
      }
    : null;

  return {
    meta,
    exportPayload,
    total,
    qualified,
    notQ,
    irrelevant,
    qualRate,
    closedWon,
    closedLost,
    routed,
    withExec,
    beyondPreSalesQualified,
    sourceEntries,
    maxSource,
    countryRows,
    cityRows,
    stageEntries,
    maxStageBar,
    qualInsightRows,
    maxQualBar,
    scoreBuckets,
    atlPassed,
    recent,
    pipelineQualified,
    allLeads: leads,
    pipelineInProgress: analytics.pipeline.inProgress,
    conversionByCountry,
    conversionByWebsite,
    conversionByProfile,
    conversionBySource,
    leadAnalystBreakdown,
    salesExecOutcomes,
    qualificationReasonRows,
  };
}

function buildUnifiedExportPayload(
  leads: UnifiedLeadRow[],
  meta: UnifiedPortalMeta,
  analytics: ReturnType<typeof buildAnalystAnalyticsReportPayload>,
  metrics: {
    total: number;
    qualified: number;
    notQ: number;
    irrelevant: number;
    qualRate: number;
    closedWon: number;
    closedLost: number;
    inProgress: number;
    assigned: number;
    routed: number;
    withExec: number;
    qualifiedPassed: number;
    qualifiedInternal: number;
    passedPct: number;
    passedWithTl: number;
    passedWithExec: number;
    passedWon: number;
    passedLost: number;
  },
  countryRows: CountryQualRow[],
  cityRows: ReturnType<typeof buildAnalystCityRows>,
  stageEntries: { stageKey: string; label: string; count: number }[],
  qualInsightRows: { label: string; count: number; pct: number }[],
  sourceEntries: [string, number][],
  conversionByCountry: ConversionDimRow[],
  conversionByWebsite: ConversionDimRow[],
  conversionByProfile: ConversionDimRow[],
  conversionBySource: ConversionDimRow[],
  leadAnalystBreakdown: LeadAnalystQualBreakdownRow[],
  salesExecOutcomes: SalesExecOutcomeRow[],
  qualificationReasonRows: QualificationReasonRow[],
): DashboardExportPayload {
  const summaryRows: { label: string; value: string | number }[] = [
    {
      label: "Portal",
      value: String(meta.kind ?? "portal").replace(/_/g, " "),
    },
    { label: "Scope", value: meta.reportSubtitle ?? "—" },
    { label: "Total leads", value: metrics.total },
    {
      label: "Qualification rate %",
      value: Number.isFinite(metrics.qualRate)
        ? metrics.qualRate.toFixed(1)
        : "—",
    },
    { label: "Qualified", value: metrics.qualified },
    { label: "Not qualified", value: metrics.notQ },
    { label: "Irrelevant", value: metrics.irrelevant },
    {
      label: "Avg lead score",
      value: analytics.kpis.avgLeadScore ?? "—",
    },
    {
      label: "Closed won rate % (won / all leads)",
      value: Number.isFinite(analytics.kpis.closedWonRatePct)
        ? analytics.kpis.closedWonRatePct.toFixed(1)
        : "—",
    },
    { label: "Routed (beyond pre-sales)", value: metrics.routed },
    { label: "With team lead", value: metrics.assigned },
    { label: "With executive", value: metrics.withExec },
    { label: "Closed won", value: metrics.closedWon },
    { label: "Closed lost", value: metrics.closedLost },
    { label: "Qualified → beyond pre-sales", value: metrics.qualifiedPassed },
    { label: "Qualified → still pre-sales", value: metrics.qualifiedInternal },
    {
      label: "Qualified passed %",
      value:
        metrics.qualified && Number.isFinite(metrics.passedPct)
          ? metrics.passedPct.toFixed(1)
          : "—",
    },
    {
      label: "Passed → with team lead",
      value: metrics.passedWithTl,
    },
    {
      label: "Passed → with executive",
      value: metrics.passedWithExec,
    },
    { label: "Passed → closed won", value: metrics.passedWon },
    { label: "Passed → closed lost", value: metrics.passedLost },
  ];

  if (meta.analystCount != null) {
    summaryRows.push({ label: "Analysts (ATL)", value: meta.analystCount });
  }
  if (meta.teamCount != null) {
    summaryRows.push({
      label: "Teams with routed leads (your analysts)",
      value: meta.teamCount,
    });
  }
  if (meta.teamName) {
    summaryRows.push({ label: "Team", value: meta.teamName });
  }
  if (meta.execCount != null) {
    summaryRows.push({
      label: "Sales executives (team)",
      value: meta.execCount,
    });
  }

  const fmtConv = (r: ConversionDimRow) => [
    r.label,
    r.total,
    r.won,
    Number.isFinite(r.conversionPct) ? r.conversionPct.toFixed(1) : "—",
  ];

  const tables: DashboardExportPayload["tables"] = [
    {
      title: "Lead analysts — qualification",
      headers: [
        "Lead analyst",
        "Total leads",
        "Qualified",
        "Not qualified",
        "Irrelevant",
      ],
      rows: leadAnalystBreakdown.map((r) => [
        r.label,
        r.total,
        r.qualified,
        r.notQ,
        r.irrelevant,
      ]),
    },
    {
      title: "Sales executives — assigned leads & outcomes",
      headers: [
        "Sales executive",
        "Assigned (in range)",
        "With rep (open)",
        "Closed — won",
        "Closed — lost",
      ],
      rows: salesExecOutcomes.map((r) => [
        r.label,
        r.assignedTotal,
        r.withRepOpen,
        r.closedWon,
        r.closedLost,
      ]),
    },
    {
      title: "Qualification reasons",
      headers: ["Status", "Reason", "Count"],
      rows: qualificationReasonRows.map((r) => [
        String(r.status ?? "").replaceAll("_", " ") || "—",
        String(r.reason ?? ""),
        r.count,
      ]),
    },
    {
      title: "By source",
      headers: ["Source", "Count"],
      rows: sourceEntries.map(([label, count]) => [
        sourcePillText(label),
        count,
      ]),
    },
    {
      title: "By country (qualification)",
      headers: ["Country", "Qualified", "Not Q", "Irrelevant", "Total"],
      rows: countryRows.map((r) => [r.label, r.q, r.nq, r.ir, r.total]),
    },
    {
      title: "By city (optional · with country)",
      headers: ["City · country", "Count"],
      rows: cityRows.map((r) => [r.label, r.count]),
    },
    {
      title: "Conversion — by country (won ÷ leads)",
      headers: ["Country", "Leads", "Won", "Conversion %"],
      rows: conversionByCountry.map(fmtConv),
    },
    {
      title: "Conversion — by website",
      headers: ["Website / brand", "Leads", "Won", "Conversion %"],
      rows: conversionByWebsite.map(fmtConv),
    },
    {
      title: "Conversion — by Meta profile",
      headers: ["Profile / page", "Leads", "Won", "Conversion %"],
      rows: conversionByProfile.map(fmtConv),
    },
    {
      title: "Conversion — by source",
      headers: ["Source", "Leads", "Won", "Conversion %"],
      rows: conversionBySource.map(fmtConv),
    },
    {
      title: "Pipeline summary",
      headers: ["Assigned", "In progress", "Closed won", "Closed lost"],
      rows: [
        [
          metrics.assigned,
          metrics.inProgress,
          metrics.closedWon,
          metrics.closedLost,
        ],
      ],
    },
    {
      title: "Score buckets",
      headers: ["Bucket", "Count"],
      rows: analytics.scoreBuckets.map((r) => [r.label, r.count]),
    },
    {
      title: "By stage",
      headers: ["Stage", "Count"],
      rows: stageEntries.map((s) => [s.label, s.count]),
    },
    {
      title: "Qualification insight",
      headers: ["Segment", "Count", "%"],
      rows: qualInsightRows.map((r) => {
        const pct = Number(r.pct);
        return [
          r.label,
          r.count,
          Number.isFinite(pct) ? pct.toFixed(1) : "—",
        ];
      }),
    },
    {
      title: "Lead snapshot",
      headers: ["Lead", "Created by", "Source", "Stage", "Assigned rep"],
      rows: leads.map((l) => [
        l.leadName ?? "—",
        l.createdByName,
        sourcePillText(l.source),
        analystFacingSalesLabel(l.salesStage),
        l.assignedRepName ?? "—",
      ]),
    },
    {
      title: "Qualified pipeline detail",
      headers: ["Lead", "Created by", "Qualified on", "Pipeline", "Note"],
      rows: leads
        .filter(
          (l) =>
            l.qualificationStatus === QualificationStatus.QUALIFIED,
        )
        .map((l) => {
          const pill = pipelinePillForLead(
            l.qualificationStatus,
            l.salesStage,
          );
          return [
            l.leadName ?? "—",
            l.createdByName,
            formatAnalystDate(l.createdAt),
            pill.label,
            pipelineNoteForLead(
              l.qualificationStatus,
              l.salesStage,
              l.notes,
              l.lostNotes,
            ),
          ];
        }),
    },
  ];

  return {
    title: meta.reportTitle,
    subtitle: meta.reportSubtitle,
    rangeLabel: meta.rangeLabel,
    generatedAt: meta.generatedAt,
    fileNamePrefix: meta.fileNamePrefix,
    summaryRows,
    tables,
  };
}
