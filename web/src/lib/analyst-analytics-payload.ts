import type { AnalystAnalyticsReportPayload } from "@/lib/analytics-report-types";
import { sourcePillText } from "@/lib/analyst-ui";
import { QualificationStatus, SalesStage } from "@/lib/constants";
import {
  buildAnalystCityRows,
  buildCountryQualRows,
} from "@/lib/leads-by-country-qual";

type LeadForAnalytics = {
  source: string;
  qualificationStatus: string;
  salesStage: string;
  /** Prefer number; pg may surface bigint for some numeric columns. */
  leadScore: number | null | bigint;
  phone: string | null;
  country: string | null;
  city: string | null;
};

function scoreBucketLabel(score: number): string {
  const n = Number(score);
  if (!Number.isFinite(n)) return "0–25";
  if (n <= 25) return "0–25";
  if (n <= 50) return "26–50";
  if (n <= 75) return "51–75";
  return "76–100";
}

/** Builds the analyst dashboard analytics / export payload from leads in range. */
export function buildAnalystAnalyticsReportPayload(
  leads: LeadForAnalytics[],
  opts: {
    rangeLabel: string;
    analystName: string;
    analystEmail: string;
    /** When set, used instead of default "Analyst analytics" title. */
    title?: string;
    /** When set, used instead of name · email subtitle. */
    subtitle?: string;
  },
): AnalystAnalyticsReportPayload {
  const total = leads.length;
  const qualified = leads.filter(
    (l) => l.qualificationStatus === QualificationStatus.QUALIFIED,
  ).length;
  const notQualified = leads.filter(
    (l) => l.qualificationStatus === QualificationStatus.NOT_QUALIFIED,
  ).length;
  const irrelevant = leads.filter(
    (l) => l.qualificationStatus === QualificationStatus.IRRELEVANT,
  ).length;
  const qualRatePct = total ? (qualified / total) * 100 : 0;

  const closedWon = leads.filter(
    (l) => l.salesStage === SalesStage.CLOSED_WON,
  ).length;
  const closedWonRatePct = total ? (closedWon / total) * 100 : 0;

  const scores = leads
    .map((l) => l.leadScore)
    .map((s) => (typeof s === "bigint" ? Number(s) : s))
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  const avgLeadScore =
    scores.length > 0
      ? Math.round(
          (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
        ) / 10
      : null;

  const bySourceMap = new Map<string, number>();
  for (const l of leads) {
    const key = l.source || "—";
    bySourceMap.set(key, (bySourceMap.get(key) ?? 0) + 1);
  }
  const bySource = [...bySourceMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label: sourcePillText(label), count }));

  const countryRows = buildCountryQualRows(leads);
  const byCountry = countryRows.map((r) => ({
    label: r.label,
    iso: r.iso,
    q: r.q,
    nq: r.nq,
    ir: r.ir,
    total: r.total,
  }));

  const byCity = buildAnalystCityRows(leads);

  const bucketMap = new Map<string, number>();
  for (const l of leads) {
    const raw = l.leadScore;
    if (raw == null) continue;
    const s = typeof raw === "bigint" ? Number(raw) : raw;
    if (typeof s !== "number" || !Number.isFinite(s)) continue;
    const label = scoreBucketLabel(s);
    bucketMap.set(label, (bucketMap.get(label) ?? 0) + 1);
  }
  const order = ["0–25", "26–50", "51–75", "76–100"];
  const scoreBuckets = order
    .filter((k) => (bucketMap.get(k) ?? 0) > 0)
    .map((label) => ({ label, count: bucketMap.get(label) ?? 0 }));

  const assigned = leads.filter(
    (l) => l.salesStage === SalesStage.WITH_TEAM_LEAD,
  ).length;
  const inProgress = leads.filter(
    (l) => l.salesStage === SalesStage.WITH_EXECUTIVE,
  ).length;
  const closedLost = leads.filter(
    (l) => l.salesStage === SalesStage.CLOSED_LOST,
  ).length;

  const generatedAt = new Date().toISOString();

  return {
    title: opts.title ?? "Analyst analytics",
    subtitle:
      opts.subtitle ?? `${opts.analystName} · ${opts.analystEmail}`,
    rangeLabel: opts.rangeLabel,
    generatedAt,
    kpis: {
      totalAdded: total,
      qualificationRatePct: Math.round(qualRatePct * 10) / 10,
      qualified,
      notQualified,
      irrelevant,
      avgLeadScore,
      closedWonRatePct: Math.round(closedWonRatePct * 10) / 10,
    },
    bySource,
    byCountry,
    byCity,
    pipeline: {
      closedWon,
      closedLost,
      inProgress,
      assigned,
    },
    scoreBuckets,
  };
}
