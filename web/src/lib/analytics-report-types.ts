/** Serializable payload for analyst analytics export (CSV / Excel / PDF). */
export type AnalystAnalyticsReportPayload = {
  title: string;
  subtitle: string;
  rangeLabel: string;
  generatedAt: string;
  kpis: {
    totalAdded: number;
    qualificationRatePct: number;
    qualified: number;
    notQualified: number;
    irrelevant: number;
    avgLeadScore: number | null;
    closedWonRatePct: number;
  };
  bySource: { label: string; count: number }[];
  byCountry: {
    label: string;
    iso: string;
    q: number;
    nq: number;
    ir: number;
    total: number;
  }[];
  /** City · country (stored city + phone-derived country), for reports / export only. */
  byCity: { label: string; count: number }[];
  pipeline: {
    closedWon: number;
    closedLost: number;
    inProgress: number;
    assigned: number;
  };
  scoreBuckets: { label: string; count: number }[];
};
