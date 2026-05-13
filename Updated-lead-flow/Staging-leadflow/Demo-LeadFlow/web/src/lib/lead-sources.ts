import { LEAD_WEBSITE_OPTIONS, normalizeLeadWebsiteLabel } from "@/lib/lead-websites";

/** Preset lead sources (dropdown). Values are stored in DB-related payloads; labels are shown in UI. */
export const LEAD_SOURCE_OPTIONS = [
  {
    value: "META_WHATSAPP",
    label: "Meta WhatsApp",
  },
  {
    value: "META_MESSENGER",
    label: "Meta Messenger",
  },
  {
    value: "WEBSITE_WHATSAPP",
    label: "Website WhatsApp",
  },
  {
    value: "META_LEAD_FORMS",
    label: "Meta Lead Form",
  },
  {
    value: "WEBSITE_LEAD_FORMS",
    label: "Website Download Form",
  },
  {
    value: "SUPPORT_NUMBERS",
    label: "G.WhatsApp(CAM/CWA/CRW)",
  },
  {
    value: "GOOGLE_LEAD_FORM",
    label: "Google LeadForm",
  },
] as const;

export type LeadSourceValue = (typeof LEAD_SOURCE_OPTIONS)[number]["value"];

const LABEL_BY_VALUE = Object.fromEntries(
  LEAD_SOURCE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<LeadSourceValue, string>;

const WEBSITE_DETAIL_SOURCES = new Set<LeadSourceValue>([
  "WEBSITE_WHATSAPP",
  "WEBSITE_LEAD_FORMS",
  "GOOGLE_LEAD_FORM",
]);

const META_DETAIL_SOURCES = new Set<LeadSourceValue>([
  "META_WHATSAPP",
  "META_MESSENGER",
  "META_LEAD_FORMS",
]);

export function leadSourceUsesWebsiteDetail(
  value: string,
): value is LeadSourceValue {
  return WEBSITE_DETAIL_SOURCES.has(value as LeadSourceValue);
}

export function leadSourceUsesMetaDetail(value: string): value is LeadSourceValue {
  return META_DETAIL_SOURCES.has(value as LeadSourceValue);
}

/** Re-export website list for forms (single import path). */
export const LEAD_WEBSITE_PRESETS = LEAD_WEBSITE_OPTIONS;

export type LeadSourceChannelDetail = {
  websiteName?: string | null;
  metaProfileName?: string | null;
};

/** Builds the stored `source` display string (preset label + optional channel detail). */
export function resolveLeadSourceLabel(
  value: string,
  otherDetail: string | null,
  channel?: LeadSourceChannelDetail | null,
): string {
  if (value in LABEL_BY_VALUE) {
    let label = LABEL_BY_VALUE[value as LeadSourceValue];
    const web = channel?.websiteName?.trim();
    const meta = channel?.metaProfileName?.trim();
    if (
      (value === "WEBSITE_WHATSAPP" ||
        value === "WEBSITE_LEAD_FORMS" ||
        value === "GOOGLE_LEAD_FORM") &&
      web
    ) {
      label += ` — ${web}`;
    }
    if (
      (value === "META_WHATSAPP" ||
        value === "META_MESSENGER" ||
        value === "META_LEAD_FORMS") &&
      meta
    ) {
      label += ` — Facebook: ${meta}`;
    }
    return label;
  }
  if (otherDetail && otherDetail.trim()) {
    return `${value} — ${otherDetail.trim()}`;
  }
  return value || "—";
}

/** Excel `source_other` → stored source string + normalized channel columns (matches Add Lead). */
export function deriveLeadSourceFromImportExtras(
  lead_source: LeadSourceValue,
  source_other: string | null,
): {
  source: string;
  sourceWebsiteName: string | null;
  sourceMetaProfileName: string | null;
} {
  const raw = source_other?.trim() || null;
  const sourceWebsiteName = leadSourceUsesWebsiteDetail(lead_source)
    ? normalizeLeadWebsiteLabel(raw)
    : null;
  const sourceMetaProfileName = leadSourceUsesMetaDetail(lead_source)
    ? raw
    : null;
  const source = resolveLeadSourceLabel(lead_source, null, {
    websiteName: sourceWebsiteName,
    metaProfileName: sourceMetaProfileName,
  });
  return { source, sourceWebsiteName, sourceMetaProfileName };
}

/** Full stored source string for tables and exports (includes website / Meta detail). */
export function formatLeadSourceDisplay(source: string | null | undefined): string {
  if (source == null) return "—";
  const t = String(source).trim();
  return t || "—";
}
