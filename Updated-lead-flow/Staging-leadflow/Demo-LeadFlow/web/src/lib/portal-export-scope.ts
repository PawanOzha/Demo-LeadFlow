import type { LeadFilters } from "@/lib/server/leads/filter-parser";
import type { SuperadminLeadsParsed } from "@/lib/superadmin-leads-filters";

/** Confirms whether the export is narrowed from “everything in scope” and summarizes current filters for the UX modal. */
export type PortalExportScope = {
  hasActiveFilters: boolean;
  bulletLines: string[];
};

function trimQ(q?: string | null): string | undefined {
  const t = q?.trim();
  return t ? t : undefined;
}

export function leadFiltersExportNarrowing(f: LeadFilters): boolean {
  if (trimQ(f.q)) return true;
  if (f.dateFrom || f.dateTo) return true;
  if (f.status) return true;
  if (f.salesStage) return true;
  if (f.source) return true;
  if (f.sourceWebsiteName) return true;
  if (f.country) return true;
  if (f.assignedExecId) return true;
  if (f.assignedMtlId) return true;
  if (f.teamId) return true;
  if (f.analystId) return true;
  return false;
}

function trunc(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function describeLeadFiltersExportLines(f: LeadFilters): string[] {
  const lines: string[] = [];
  if (f.dateFrom && f.dateTo) lines.push(`Date: ${f.dateFrom} → ${f.dateTo}`);
  else if (f.dateFrom) lines.push(`Date: From ${f.dateFrom}`);
  else if (f.dateTo) lines.push(`Date: Until ${f.dateTo}`);
  else lines.push("Date: All time");

  const sq = trimQ(f.q);
  lines.push(sq ? `Search: "${trunc(sq, 56)}"` : "Search: none");
  lines.push(
    f.status
      ? `Qualification: ${f.status.replace(/_/g, " ")}`
      : "Qualification: any",
  );
  lines.push(
    f.salesStage
      ? `Sales stage: ${f.salesStage.replace(/_/g, " ")}`
      : "Sales stage: any",
  );
  lines.push(f.source ? `Source: ${trunc(f.source, 48)}` : "Source: any");
  lines.push(
    f.sourceWebsiteName
      ? `Website / brand: ${trunc(f.sourceWebsiteName, 48)}`
      : "Website / brand: any",
  );
  if (f.country) lines.push(`Country: ${f.country}`);
  if (f.analystId) lines.push("Analyst: selected");
  if (f.teamId) lines.push("Team: selected");
  if (f.assignedExecId) lines.push("Sales executive: selected");
  if (f.assignedMtlId) lines.push("Main team lead: selected");
  return lines;
}

export function exportScopeFromLeadFilters(f: LeadFilters): PortalExportScope {
  return {
    hasActiveFilters: leadFiltersExportNarrowing(f),
    bulletLines: describeLeadFiltersExportLines(f),
  };
}

export function analystExportFiltersToLeadFilters(e: {
  from: string | null;
  to: string | null;
  q: string | null;
  status?: string | null;
  salesStage?: string | null;
  source?: string | null;
}): LeadFilters {
  return {
    dateFrom: e.from ?? undefined,
    dateTo: e.to ?? undefined,
    q: e.q ?? undefined,
    status: e.status ?? undefined,
    salesStage: e.salesStage ?? undefined,
    source: e.source ?? undefined,
  };
}

export function atlExportFiltersToLeadFilters(e: {
  from: string | null;
  to: string | null;
  q: string | null;
  status: string | null;
  analystId: string | null;
  source: string | null;
  website?: string | null;
}): LeadFilters {
  return {
    dateFrom: e.from ?? undefined,
    dateTo: e.to ?? undefined,
    q: e.q ?? undefined,
    status: e.status ?? undefined,
    analystId: e.analystId ?? undefined,
    source: e.source ?? undefined,
    sourceWebsiteName: e.website ?? undefined,
  };
}

export function exportScopeAtlDashboard(
  from: string | null,
  to: string | null,
  q: string | null,
  listFilters: {
    qualificationStatus?: string | null;
    createdById?: string | null;
    source?: string | null;
    sourceWebsiteName?: string | null;
  },
): PortalExportScope {
  const lf: LeadFilters = {
    dateFrom: from ?? undefined,
    dateTo: to ?? undefined,
    q: q ?? undefined,
    status: listFilters.qualificationStatus ?? undefined,
    analystId: listFilters.createdById ?? undefined,
    source: listFilters.source ?? undefined,
    sourceWebsiteName: listFilters.sourceWebsiteName ?? undefined,
  };
  return exportScopeFromLeadFilters(lf);
}

export function superadminLeadsParsedExportScope(
  p: SuperadminLeadsParsed,
): PortalExportScope {
  const narrowed =
    trimQ(p.q) != null ||
    p.duplicatePhonesOnly ||
    p.status !== "ALL" ||
    Boolean(p.analystId?.trim()) ||
    Boolean(p.teamId?.trim()) ||
    Boolean(p.execId?.trim()) ||
    Boolean(p.from && p.to);

  const lines: string[] = [];
  if (p.from && p.to) lines.push(`Date: ${p.from} → ${p.to}`);
  else lines.push("Date: All time");

  const sq = trimQ(p.q);
  lines.push(sq ? `Search: "${trunc(sq, 56)}"` : "Search: none");
  lines.push(
    p.duplicatePhonesOnly ? "Mode: Duplicate phones only" : "Mode: All leads",
  );
  lines.push(
    p.status !== "ALL"
      ? `Qualification: ${p.status.replace(/_/g, " ")}`
      : "Qualification: any",
  );
  lines.push(
    p.analystId?.trim() ? "Lead analyst: selected" : "Lead analyst: any",
  );
  lines.push(p.teamId?.trim() ? "Team: selected" : "Team: any");
  lines.push(
    p.execId?.trim() ? "Sales executive: selected" : "Sales executive: any",
  );

  return { hasActiveFilters: narrowed, bulletLines: lines };
}

export function superadminUsersExportScope(
  roleFilter: string,
  qFilter: string,
): PortalExportScope {
  const hasRole = Boolean(roleFilter.trim());
  const hasQ = Boolean(qFilter.trim());
  const lines = [
    hasRole ? `Role: ${roleFilter}` : "Role: All roles",
    hasQ ? `Search: "${trunc(qFilter.trim(), 56)}"` : "Search: none",
  ];
  return { hasActiveFilters: hasRole || hasQ, bulletLines: lines };
}

/** Superadmin organization report: only date narrowing is available today. */
export function reportDateExportScope(
  from: string | null,
  to: string | null,
): PortalExportScope {
  const has = Boolean(from || to);
  const lines =
    from && to
      ? [`Date: ${from} → ${to}`]
      : from
        ? [`Date: From ${from}`]
        : to
          ? [`Date: Until ${to}`]
          : ["Date: All time"];

  lines.push(
    "Exports match the charts and tables above (respects row caps in each file).",
  );
  return { hasActiveFilters: has, bulletLines: lines };
}

export function formatPortalExportKindLabel(kind: "csv" | "xlsx" | "pdf") {
  if (kind === "pdf") return "PDF";
  if (kind === "xlsx") return "Excel (.xlsx)";
  return "CSV";
}
