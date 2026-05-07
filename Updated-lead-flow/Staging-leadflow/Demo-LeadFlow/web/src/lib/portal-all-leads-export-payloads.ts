import type { DashboardExportPayload } from "@/lib/dashboard-export-types";
import { analystFacingSalesLabel } from "@/lib/sales-stage-labels";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import { formatDealMoney } from "@/lib/deal-money";

export type PortalAnalystLeadExportRow = {
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  source: string;
  notes: string | null;
  lostNotes: string | null;
  qualificationStatus: string;
  leadScore: number | null;
  salesStage: string;
  createdAt: string;
  estimatedDealValue: number | null;
  closedRevenue: number | null;
  dealCurrency: string;
};

export type PortalAtlLeadExportRow = {
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  source: string;
  notes: string | null;
  lostNotes: string | null;
  qualificationStatus: string;
  leadScore: number | null;
  salesStage: string;
  createdAt: string;
  analystName: string;
  teamName: string | null;
  mtlName: string | null;
  repName: string | null;
  routedToMainTeamAt: string | null;
  assignedToExecutiveAt: string | null;
  directAssignedToExecutiveByAtlAt: string | null;
};

export type PortalExecLeadExportRow = {
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  source: string;
  notes: string | null;
  lostNotes: string | null;
  leadScore: number | null;
  salesStage: string;
  execDeadlineAt: string | null;
  createdAt: string;
  analystName: string;
  estimatedDealValue: number | null;
  closedRevenue: number | null;
  dealCurrency: string;
};

export type PortalMtlLeadExportRow = {
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  source: string;
  notes: string | null;
  lostNotes: string | null;
  leadScore: number | null;
  salesStage: string;
  execDeadlineAt: string | null;
  analystName: string;
  repName: string | null;
};

export type PortalSuperadminLeadExportRow = {
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  country: string | null;
  city: string | null;
  source: string;
  notes: string | null;
  lostNotes: string | null;
  qualificationStatus: string;
  leadScore: number | null;
  salesStage: string;
  createdAt: string;
  createdByLabel: string;
  teamName: string | null;
  mtlLabel: string | null;
  execLabel: string | null;
  handoffSummary: string;
  estimatedDealValue: number | null;
  closedRevenue: number | null;
  dealCurrency: string;
};

function exportSummaryExtras(opts: {
  rangeTotalCount: number;
  exportRowCount: number;
  cap: number;
}): { label: string; value: string | number }[] {
  const out: { label: string; value: string | number }[] = [
    {
      label: "Leads matching date & filters (total)",
      value: opts.rangeTotalCount,
    },
    {
      label: "Rows in this file",
      value: opts.exportRowCount,
    },
  ];
  if (opts.rangeTotalCount > opts.exportRowCount) {
    out.push({
      label: "Export cap",
      value: `First ${opts.cap.toLocaleString()} rows by recency (refine filters or date range to narrow).`,
    });
  }
  return out;
}

export function buildAnalystLeadsExportPayload(
  rows: PortalAnalystLeadExportRow[],
  opts: {
    rangeLabel: string;
    searchQuery: string;
    rangeTotalCount: number;
    exportRowCount: number;
  },
): DashboardExportPayload {
  const generatedAt = new Date().toISOString();
  const q = opts.searchQuery.trim();
  const summaryRows: { label: string; value: string | number }[] = [
    { label: "Leads in this export", value: rows.length },
    { label: "Date range", value: opts.rangeLabel },
    ...exportSummaryExtras({
      rangeTotalCount: opts.rangeTotalCount,
      exportRowCount: opts.exportRowCount,
      cap: PORTAL_LEADS_EXPORT_ROW_CAP,
    }),
  ];
  if (q) summaryRows.splice(2, 0, { label: "Name or phone search", value: q });

  const headers = [
    "Name",
    "Phone",
    "Email",
    "Source",
    "Qualification",
    "Score",
    "Sales stage",
    "Deal estimate",
    "Closed revenue",
    "Currency",
    "Analyst notes",
    "Executive notes",
    "Added",
  ];

  const tableRows = rows.map((l) => [
    l.leadName || "—",
    l.phone || "—",
    l.leadEmail || "—",
    l.source || "—",
    String(l.qualificationStatus ?? "").replaceAll("_", " ") || "—",
    l.leadScore ?? "—",
    analystFacingSalesLabel(l.salesStage),
    formatDealMoney(l.estimatedDealValue, l.dealCurrency),
    formatDealMoney(l.closedRevenue, l.dealCurrency),
    l.dealCurrency ?? "USD",
    l.notes ?? "—",
    l.lostNotes ?? "—",
    l.createdAt ? new Date(l.createdAt).toLocaleString() : "—",
  ]);

  return {
    title: "All leads export",
    subtitle: "Lead analyst · Your leads in range",
    rangeLabel: opts.rangeLabel,
    generatedAt,
    fileNamePrefix: "leadflow-analyst-leads",
    summaryRows,
    tables: [{ title: "Leads", headers, rows: tableRows }],
  };
}

export function buildAtlLeadsExportPayload(
  rows: PortalAtlLeadExportRow[],
  opts: {
    rangeLabel: string;
    searchQuery: string;
    rangeTotalCount: number;
    exportRowCount: number;
  },
): DashboardExportPayload {
  const generatedAt = new Date().toISOString();
  const q = opts.searchQuery.trim();
  const summaryRows: { label: string; value: string | number }[] = [
    { label: "Leads in this export", value: rows.length },
    { label: "Date range", value: opts.rangeLabel },
    ...exportSummaryExtras({
      rangeTotalCount: opts.rangeTotalCount,
      exportRowCount: opts.exportRowCount,
      cap: PORTAL_LEADS_EXPORT_ROW_CAP,
    }),
  ];
  if (q) summaryRows.splice(2, 0, { label: "Name or phone search", value: q });

  const headers = [
    "Name",
    "Phone",
    "Email",
    "Source",
    "Qualification",
    "Score",
    "Sales stage",
    "Lead analyst",
    "Team",
    "Main team lead",
    "Rep",
    "Routed to main team",
    "Assigned to executive",
    "ATL direct to executive",
    "Analyst notes",
    "Executive notes",
    "Added",
  ];

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString() : "—";

  const tableRows = rows.map((l) => [
    l.leadName || "—",
    l.phone || "—",
    l.leadEmail || "—",
    l.source || "—",
    String(l.qualificationStatus ?? "").replaceAll("_", " ") || "—",
    l.leadScore ?? "—",
    analystFacingSalesLabel(l.salesStage),
    l.analystName,
    l.teamName ?? "—",
    l.mtlName ?? "—",
    l.repName ?? "—",
    fmt(l.routedToMainTeamAt),
    fmt(l.assignedToExecutiveAt),
    fmt(l.directAssignedToExecutiveByAtlAt),
    l.notes ?? "—",
    l.lostNotes ?? "—",
    l.createdAt ? new Date(l.createdAt).toLocaleString() : "—",
  ]);

  return {
    title: "All leads export",
    subtitle: "Analyst team lead · Your analysts’ leads in range",
    rangeLabel: opts.rangeLabel,
    generatedAt,
    fileNamePrefix: "leadflow-atl-leads",
    summaryRows,
    tables: [{ title: "Leads", headers, rows: tableRows }],
  };
}

export function buildExecLeadsExportPayload(
  rows: PortalExecLeadExportRow[],
  opts: {
    rangeLabel: string;
    searchQuery: string;
    rangeTotalCount: number;
    exportRowCount: number;
  },
): DashboardExportPayload {
  const generatedAt = new Date().toISOString();
  const q = opts.searchQuery.trim();
  const summaryRows: { label: string; value: string | number }[] = [
    { label: "Leads in this export", value: rows.length },
    { label: "Date range", value: opts.rangeLabel },
    ...exportSummaryExtras({
      rangeTotalCount: opts.rangeTotalCount,
      exportRowCount: opts.exportRowCount,
      cap: PORTAL_LEADS_EXPORT_ROW_CAP,
    }),
  ];
  if (q) summaryRows.splice(2, 0, { label: "Name or phone search", value: q });

  const headers = [
    "Name",
    "Phone",
    "Email",
    "Source",
    "Lead analyst",
    "Score",
    "Deadline",
    "Stage",
    "Deal estimate",
    "Closed revenue",
    "Currency",
    "Analyst notes",
    "Lost-deal notes",
    "Added",
  ];

  const tableRows = rows.map((l) => [
    l.leadName || "—",
    l.phone || "—",
    l.leadEmail || "—",
    l.source || "—",
    l.analystName,
    l.leadScore ?? "—",
    l.execDeadlineAt ? new Date(l.execDeadlineAt).toLocaleString() : "—",
    analystFacingSalesLabel(l.salesStage),
    formatDealMoney(l.estimatedDealValue, l.dealCurrency),
    formatDealMoney(l.closedRevenue, l.dealCurrency),
    l.dealCurrency ?? "USD",
    l.notes ?? "—",
    l.lostNotes ?? "—",
    l.createdAt ? new Date(l.createdAt).toLocaleString() : "—",
  ]);

  return {
    title: "All leads export",
    subtitle: "Sales executive · Leads assigned to you",
    rangeLabel: opts.rangeLabel,
    generatedAt,
    fileNamePrefix: "leadflow-executive-leads",
    summaryRows,
    tables: [{ title: "Leads", headers, rows: tableRows }],
  };
}

export function buildMtlLeadsExportPayloadFromPortalRows(
  rows: PortalMtlLeadExportRow[],
  opts: {
    rangeLabel: string;
    searchQuery: string;
    rangeTotalCount: number;
    exportRowCount: number;
  },
): DashboardExportPayload {
  const generatedAt = new Date().toISOString();
  const q = opts.searchQuery.trim();
  const summaryRows: { label: string; value: string | number }[] = [
    { label: "Leads in this export", value: rows.length },
    { label: "Date range", value: opts.rangeLabel },
    ...exportSummaryExtras({
      rangeTotalCount: opts.rangeTotalCount,
      exportRowCount: opts.exportRowCount,
      cap: PORTAL_LEADS_EXPORT_ROW_CAP,
    }),
  ];
  if (q) summaryRows.splice(2, 0, { label: "Name or phone search", value: q });

  const headers = [
    "Name",
    "Phone",
    "Email",
    "Source",
    "Analyst",
    "Score",
    "Stage",
    "Analyst notes",
    "Executive notes",
    "Rep",
    "Deadline",
  ];

  const tableRows = rows.map((lead) => [
    lead.leadName || "—",
    lead.phone || "—",
    lead.leadEmail || "—",
    lead.source || "—",
    lead.analystName,
    lead.leadScore ?? "—",
    lead.salesStage.replaceAll("_", " "),
    lead.notes ?? "—",
    lead.lostNotes ?? "—",
    lead.repName ?? "—",
    lead.execDeadlineAt ? new Date(lead.execDeadlineAt).toLocaleString() : "—",
  ]);

  return {
    title: "All leads export",
    subtitle: "Main team lead · Qualified leads routed to your team",
    rangeLabel: opts.rangeLabel,
    generatedAt,
    fileNamePrefix: "leadflow-mtl-leads",
    summaryRows,
    tables: [{ title: "Leads", headers, rows: tableRows }],
  };
}

export function buildSuperadminLeadsExportPayload(
  rows: PortalSuperadminLeadExportRow[],
  opts: {
    filterSummary: string;
    rangeTotalCount: number;
    exportRowCount: number;
  },
): DashboardExportPayload {
  const generatedAt = new Date().toISOString();
  const summaryRows: { label: string; value: string | number }[] = [
    { label: "Leads in this export", value: rows.length },
    { label: "Active filters", value: opts.filterSummary || "—" },
    ...exportSummaryExtras({
      rangeTotalCount: opts.rangeTotalCount,
      exportRowCount: opts.exportRowCount,
      cap: PORTAL_LEADS_EXPORT_ROW_CAP,
    }),
  ];

  const headers = [
    "Name",
    "Phone",
    "Email",
    "Country",
    "City",
    "Source",
    "Qualification",
    "Score",
    "Sales stage",
    "Deal estimate",
    "Closed revenue",
    "Currency",
    "Created",
    "Lead analyst",
    "Team",
    "Main team lead",
    "Sales executive",
    "Analyst notes",
    "Executive notes",
    "Handoff summary",
  ];

  const tableRows = rows.map((l) => [
    l.leadName || "—",
    l.phone || "—",
    l.leadEmail || "—",
    l.country ?? "—",
    l.city ?? "—",
    l.source || "—",
    String(l.qualificationStatus ?? "").replaceAll("_", " ") || "—",
    l.leadScore ?? "—",
    analystFacingSalesLabel(l.salesStage),
    formatDealMoney(l.estimatedDealValue, l.dealCurrency),
    formatDealMoney(l.closedRevenue, l.dealCurrency),
    l.dealCurrency ?? "USD",
    l.createdAt ? new Date(l.createdAt).toLocaleString() : "—",
    l.createdByLabel,
    l.teamName ?? "—",
    l.mtlLabel ?? "—",
    l.execLabel ?? "—",
    l.notes ?? "—",
    l.lostNotes ?? "—",
    l.handoffSummary || "—",
  ]);

  return {
    title: "All leads export",
    subtitle: "Superadmin · Leads matching current filters",
    rangeLabel: opts.filterSummary || "All filters",
    generatedAt,
    fileNamePrefix: "leadflow-superadmin-leads",
    summaryRows,
    tables: [{ title: "Leads", headers, rows: tableRows }],
  };
}
