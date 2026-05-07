/** Serializable aggregate shape from `getSuperadminReportAggregates`. */
export type SuperadminReportAggregateExport = {
  /** Included for unified export; same schema as portal dashboards. */
  leads: {
    id: string;
    leadName: string | null;
    source: string;
    qualificationStatus: string;
    salesStage: string;
    leadScore: number | null;
    phone: string | null;
    country: string | null;
    city: string | null;
    createdAt: Date;
    notes: string | null;
    createdBy: { name: string };
    assignedSalesExec: { name: string } | null;
  }[];
  total: number;
  qualified: number;
  notQualified: number;
  irrelevant: number;
  closedWon: number;
  closedLost: number;
  qualifiedRatio: number;
  notQualifiedRatio: number;
  irrelevantRatio: number;
  conversionRatio: number;
  winRateAmongClosed: number;
  lostRateAmongClosed: number;
  lostRatioOfAll: number;
  countryRows: { country: string; count: number }[];
  cityRows: { label: string; count: number }[];
  scoreHistogram: { label: string; count: number }[];
  createdByMonth: { label: string; count: number }[];
  countryHistogram: { label: string; count: number }[];
};
