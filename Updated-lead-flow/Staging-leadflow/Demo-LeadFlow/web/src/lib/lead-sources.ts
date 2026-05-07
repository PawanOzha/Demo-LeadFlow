/** Preset lead sources (dropdown). */
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
    label: "Meta Lead Forms",
  },
  {
    value: "WEBSITE_LEAD_FORMS",
    label: "Website Lead Forms",
  },
  {
    value: "SUPPORT_NUMBERS",
    label: "Support Numbers (CAM/CWA/CRW)",
  },
] as const;

export type LeadSourceValue = (typeof LEAD_SOURCE_OPTIONS)[number]["value"];

const LABEL_BY_VALUE: Record<LeadSourceValue, string> = {
  META_WHATSAPP: "Meta WhatsApp",
  META_MESSENGER: "Meta Messenger",
  WEBSITE_WHATSAPP: "Website WhatsApp",
  META_LEAD_FORMS: "Meta Lead Forms",
  WEBSITE_LEAD_FORMS: "Website Lead Forms",
  SUPPORT_NUMBERS: "Support Numbers (CAM/CWA/CRW)",
};

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
    if ((value === "WEBSITE_WHATSAPP" || value === "WEBSITE_LEAD_FORMS") && web) {
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

/** Full stored source string for tables and exports (includes website / Meta detail). */
export function formatLeadSourceDisplay(source: string | null | undefined): string {
  if (source == null) return "—";
  const t = String(source).trim();
  return t || "—";
}
