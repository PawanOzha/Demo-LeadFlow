import type { AnalystAnalyticsReportPayload } from "@/lib/analytics-report-types";
import type { CountryQualRow } from "@/lib/leads-by-country-qual";
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";

export function analystAnalyticsToDashboardExport(
  p: AnalystAnalyticsReportPayload,
): DashboardExportPayload {
  const summaryRows = [
    { label: "Total added", value: p.kpis.totalAdded },
    {
      label: "Qualification rate %",
      value: p.kpis.qualificationRatePct.toFixed(1),
    },
    { label: "Qualified", value: p.kpis.qualified },
    { label: "Not qualified", value: p.kpis.notQualified },
    { label: "Irrelevant", value: p.kpis.irrelevant },
    {
      label: "Avg lead score",
      value: p.kpis.avgLeadScore ?? "—",
    },
    {
      label: "Closed won rate %",
      value: p.kpis.closedWonRatePct.toFixed(1),
    },
  ];

  const tables = [
    {
      title: "By source",
      headers: ["Source", "Count"],
      rows: p.bySource.map((r) => [r.label, r.count]),
    },
    {
      title: "By country",
      headers: ["Country", "Qualified", "Not Q", "Irrelevant", "Total"],
      rows: p.byCountry.map((r) => [r.label, r.q, r.nq, r.ir, r.total]),
    },
    {
      title: "By city (optional · with country)",
      headers: ["City · country", "Count"],
      rows: p.byCity.map((r) => [r.label, r.count]),
    },
    {
      title: "Pipeline",
      headers: ["Closed won", "Closed lost", "In progress", "Assigned"],
      rows: [
        [
          p.pipeline.closedWon,
          p.pipeline.closedLost,
          p.pipeline.inProgress,
          p.pipeline.assigned,
        ],
      ],
    },
    {
      title: "Score buckets",
      headers: ["Bucket", "Count"],
      rows: p.scoreBuckets.map((r) => [r.label, r.count]),
    },
  ];

  return {
    title: p.title,
    subtitle: p.subtitle,
    rangeLabel: p.rangeLabel,
    generatedAt: p.generatedAt,
    fileNamePrefix: "analyst-analytics",
    summaryRows,
    tables,
  };
}

type AtlExportInput = {
  rangeLabel: string;
  generatedAt: string;
  analystCount: number;
  teamCount: number;
  total: number;
  qualified: number;
  qualRate: number;
  notQ: number;
  irrelevant: number;
  routed: number;
  withExec: number;
  closedWon: number;
  qualInsightRows: { label: string; count: number; pct: number }[];
  stageEntries: { stageLabel: string; count: number }[];
  qualifiedPassed: number;
  qualifiedInternal: number;
  passedPct: number;
  passedWithTl: number;
  passedWithExec: number;
  passedWon: number;
  passedLost: number;
  sourceRows: { label: string; count: number }[];
  countryRows: CountryQualRow[];
  teamLeadsRows: { lead: string; analyst: string; source: string; stage: string }[];
  pipelineRows: {
    lead: string;
    analyst: string;
    qualifiedOn: string;
    pipeline: string;
    note: string;
  }[];
};

export function buildAnalystTeamLeadDashboardExport(
  p: AtlExportInput,
): DashboardExportPayload {
  const summaryRows = [
    { label: "Analysts", value: p.analystCount },
    { label: "Sales teams", value: p.teamCount },
    { label: "Total leads (range)", value: p.total },
    { label: "Qualified", value: p.qualified },
    { label: "Qualification rate %", value: p.qualRate.toFixed(1) },
    { label: "Not qualified", value: p.notQ },
    { label: "Irrelevant", value: p.irrelevant },
    { label: "Routed", value: p.routed },
    { label: "With executive", value: p.withExec },
    { label: "Closed won", value: p.closedWon },
    { label: "Qualified → passed (count)", value: p.qualifiedPassed },
    { label: "Qualified → internal", value: p.qualifiedInternal },
    { label: "Passed %", value: p.passedPct.toFixed(1) },
    { label: "Passed → with TL", value: p.passedWithTl },
    { label: "Passed → with exec", value: p.passedWithExec },
    { label: "Passed → won", value: p.passedWon },
    { label: "Passed → lost", value: p.passedLost },
  ];

  const tables = [
    {
      title: "Qualification insight",
      headers: ["Segment", "Count", "%"],
      rows: p.qualInsightRows.map((r) => [r.label, r.count, r.pct.toFixed(1)]),
    },
    {
      title: "By stage",
      headers: ["Stage", "Count"],
      rows: p.stageEntries.map((r) => [r.stageLabel, r.count]),
    },
    {
      title: "By source",
      headers: ["Source", "Count"],
      rows: p.sourceRows.map((r) => [r.label, r.count]),
    },
    {
      title: "Country & qualification",
      headers: ["Country", "Qualified", "Not Q", "Irrelevant"],
      rows: p.countryRows.map((r) => [r.label, r.q, r.nq, r.ir]),
    },
    {
      title: "Team leads",
      headers: ["Lead", "Analyst", "Source", "Stage"],
      rows: p.teamLeadsRows.map((r) => [r.lead, r.analyst, r.source, r.stage]),
    },
    {
      title: "Pipeline",
      headers: ["Lead", "Analyst", "Qualified on", "Pipeline", "Note"],
      rows: p.pipelineRows.map((r) => [
        r.lead,
        r.analyst,
        r.qualifiedOn,
        r.pipeline,
        r.note,
      ]),
    },
  ];

  return {
    title: "Analyst team lead dashboard",
    subtitle: `Analysts · ${p.analystCount} · Teams · ${p.teamCount}`,
    rangeLabel: p.rangeLabel,
    generatedAt: p.generatedAt,
    fileNamePrefix: "atl-dashboard",
    summaryRows,
    tables,
  };
}

type MtlExportInput = {
  rangeLabel: string;
  generatedAt: string;
  teamName: string;
  execCount: number;
  total: number;
  awaitingAssign: number;
  withExec: number;
  closedWon: number;
  stageEntries: { stageLabel: string; count: number }[];
  countryRows: CountryQualRow[];
  leadsRows: {
    lead: string;
    createdBy: string;
    stage: string;
    assignedRep: string;
  }[];
};

export function buildMainTeamLeadDashboardExport(
  p: MtlExportInput,
): DashboardExportPayload {
  const summaryRows = [
    { label: "Team", value: p.teamName },
    { label: "Sales executives", value: p.execCount },
    { label: "Total leads (range)", value: p.total },
    { label: "Awaiting assign", value: p.awaitingAssign },
    { label: "With executive", value: p.withExec },
    { label: "Closed won", value: p.closedWon },
  ];

  const tables = [
    {
      title: "By stage",
      headers: ["Stage", "Count"],
      rows: p.stageEntries.map((r) => [r.stageLabel, r.count]),
    },
    {
      title: "Country & qualification",
      headers: ["Country", "Qualified", "Not Q", "Irrelevant"],
      rows: p.countryRows.map((r) => [r.label, r.q, r.nq, r.ir]),
    },
    {
      title: "Leads",
      headers: ["Lead", "Created by", "Stage", "Assigned rep"],
      rows: p.leadsRows.map((r) => [
        r.lead,
        r.createdBy,
        r.stage,
        r.assignedRep,
      ]),
    },
  ];

  return {
    title: "Main team lead dashboard",
    subtitle: p.teamName,
    rangeLabel: p.rangeLabel,
    generatedAt: p.generatedAt,
    fileNamePrefix: "mtl-dashboard",
    summaryRows,
    tables,
  };
}
