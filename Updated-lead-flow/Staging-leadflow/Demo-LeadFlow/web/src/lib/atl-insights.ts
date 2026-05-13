import { QualificationStatus, SalesStage } from "@/lib/constants";

export type LeadForAtlInsight = {
  qualificationStatus: string;
  salesStage: string;
  source: string | null;
};

export function computeAtlInsights(leads: LeadForAtlInsight[]) {
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

  const routed = leads.filter(
    (l) =>
      l.salesStage === SalesStage.WITH_TEAM_LEAD ||
      l.salesStage === SalesStage.WITH_EXECUTIVE ||
      l.salesStage === SalesStage.CLOSED_WON ||
      l.salesStage === SalesStage.CLOSED_LOST,
  ).length;
  const withExec = leads.filter(
    (l) => l.salesStage === SalesStage.WITH_EXECUTIVE,
  ).length;
  const closedWon = leads.filter(
    (l) => l.salesStage === SalesStage.CLOSED_WON,
  ).length;

  const bySource = new Map<string, number>();
  for (const l of leads) {
    const key = l.source || "—";
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }
  const sourceEntries = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
  const maxSource = sourceEntries[0]?.[1] ?? 1;

  const stageOrder = [
    SalesStage.PRE_SALES,
    SalesStage.WITH_TEAM_LEAD,
    SalesStage.WITH_EXECUTIVE,
    SalesStage.CLOSED_WON,
    SalesStage.CLOSED_LOST,
  ] as const;
  const byStageCount = new Map<string, number>();
  for (const st of stageOrder) byStageCount.set(st, 0);
  for (const l of leads) {
    byStageCount.set(
      l.salesStage,
      (byStageCount.get(l.salesStage) ?? 0) + 1,
    );
  }
  const stageEntries = stageOrder.map(
    (st) => [st, byStageCount.get(st) ?? 0] as const,
  );
  const maxStageBar = Math.max(...stageEntries.map(([, n]) => n), 1);

  const qualInsightRows = (
    [
      ["Qualified", qualified, "bg-[#10B981]"],
      ["Not qualified", notQ, "bg-[#F59E0B]"],
      ["Irrelevant", irrelevant, "bg-[#64748b]"],
    ] as const
  ).map(([label, count, barClass]) => ({
    label,
    count,
    barClass,
    pct: total ? Math.round((count / total) * 100) : 0,
  }));
  const maxQualBar = Math.max(qualified, notQ, irrelevant, 1);

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

  return {
    total,
    qualified,
    notQ,
    irrelevant,
    qualRate,
    routed,
    withExec,
    closedWon,
    sourceEntries,
    maxSource,
    stageEntries,
    maxStageBar,
    qualInsightRows,
    maxQualBar,
    qualifiedPassedCount: qualifiedPassed.length,
    qualifiedInternalCount: qualifiedInternal.length,
    passedPct,
    passedWithTl,
    passedWithExec,
    passedWon,
    passedLost,
  };
}
