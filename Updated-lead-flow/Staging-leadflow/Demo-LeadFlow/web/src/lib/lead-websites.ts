/** Preset website / brand names (aligned with Add Lead + Excel import). */
export const LEAD_WEBSITE_OPTIONS = [
  "ACSRPL Australia",
  "ACSRPL Report",
  "ACSRPL Writing",
  "BestCDRWriter.com",
  "CCL Hub",
  "CDRAssessmenthelp.com",
  "CDRAustraliaExperts.com",
  "CDRAustraliaGroup.com",
  "CDRAustraliaHelp.com",
  "CDRAustraliaMigration.com",
  "CDRAustraliaOnline.com",
  "CDRAustraliaService.com",
  "CDRAustraliaVIP.com",
  "CDRForEngineer.com",
  "CDRGenius.com",
  "CDRPlanetAustralia.com",
  "CDRReportWriters.com",
  "CDRReview.com.au",
  "CDRSkillAssesement.com",
  "CDRWritersAustralia.com",
  "CDRWritersHub.com",
  "CDRWritingExpert.com",
  "Immidocs.com.au",
  "Migrationmatch.com",
  "MigrationSkillsAustralia.com",
  "NepaliNaatiCCL.com.au",
  "PTEHub.net",
  "ReportChamps.com",
  "ReportInsiders.com",
  "TopCDRAustralia.com",
  "WriteMyCDR.com",
] as const;

export type LeadWebsiteLabel = (typeof LEAD_WEBSITE_OPTIONS)[number];

const LOWER_PRESET = new Map<string, LeadWebsiteLabel>(
  LEAD_WEBSITE_OPTIONS.map((label) => [label.toLowerCase(), label]),
);

/** Canonical preset label if `raw` matches the portal list; otherwise null (invalid or empty). */
export function normalizePortalWebsitePreset(
  raw: string | null | undefined,
): LeadWebsiteLabel | null {
  const t = raw?.trim();
  if (!t) return null;
  const canon = LOWER_PRESET.get(t.toLowerCase());
  return canon ?? null;
}

/** Required add-lead field: must be one of the preset portal websites. */
export function requirePortalWebsiteSelection(
  raw: string | null | undefined,
): LeadWebsiteLabel | null {
  return normalizePortalWebsitePreset(raw);
}

/** Map Excel/form input to the canonical preset label, or return trimmed free text. */
export function normalizeLeadWebsiteLabel(
  raw: string | null | undefined,
): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return LOWER_PRESET.get(t.toLowerCase()) ?? t;
}
