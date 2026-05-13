import {
  LEAD_SOURCE_OPTIONS,
  deriveLeadSourceFromImportExtras,
  type LeadSourceValue,
} from "@/lib/lead-sources";
import { normalizePortalWebsitePreset } from "@/lib/lead-websites";
import { QualificationStatus } from "@/lib/constants";

/** Canonical internal keys present in templates / parsing (unique). */
export const ANALYST_IMPORT_HEADER_KEYS = [
  "portal_website",
  "lead_source",
  "full_name",
  "phone",
  "email",
  "city",
  "source_other",
  "qualification",
  "lead_score",
  "date_added",
  "notes",
] as const;

export type AnalystImportHeaderKey =
  (typeof ANALYST_IMPORT_HEADER_KEYS)[number];

/**
 * Recommended row-1 Excel column order and header text. Two columns bind to the
 * same internal `lead_source`: later occurrence wins when both hold a value.
 */
export const ANALYST_IMPORT_TEMPLATE_COLUMNS: {
  header: string;
  key: AnalystImportHeaderKey;
}[] = [
  { header: "websites_name", key: "portal_website" },
  { header: "leads_source", key: "lead_source" },
  { header: "full_name", key: "full_name" },
  { header: "phone", key: "phone" },
  { header: "email", key: "email" },
  { header: "city", key: "city" },
  { header: "lead_source", key: "lead_source" },
  { header: "source_other", key: "source_other" },
  { header: "qualification", key: "qualification" },
  { header: "lead_score", key: "lead_score" },
  { header: "date_added", key: "date_added" },
  { header: "notes", key: "notes" },
];

/** Human-readable metadata per internal key (for docs UI). */
export const ANALYST_IMPORT_COLUMN_META: {
  key: AnalystImportHeaderKey;
  label: string;
  required: boolean;
  hint?: string;
}[] = [
  {
    key: "portal_website",
    label: "Portal website",
    required: false,
    hint:
      "Optional unless your process requires it. Must match preset from Add Lead (same as header websites_name).",
  },
  {
    key: "lead_source",
    label: "Lead source (preset code)",
    required: true,
    hint: `Use header leads_source or lead_source (same row). Values: ${LEAD_SOURCE_OPTIONS.map((o) => o.value).join(", ")}. If both columns have values, the rightmost wins.`,
  },
  {
    key: "full_name",
    label: "Full Name",
    required: true,
    hint: "Prospect’s full name",
  },
  {
    key: "phone",
    label: "Phone",
    required: true,
    hint: "International format with country code (e.g. +91…)",
  },
  {
    key: "email",
    label: "Email",
    required: false,
  },
  { key: "city", label: "City", required: false },
  {
    key: "source_other",
    label: "Source detail",
    required: false,
    hint:
      "For Website WhatsApp, Website Download Form, or Google LeadForm: site name (preset list or any text). For Meta: Facebook page/profile. Otherwise blank.",
  },
  {
    key: "qualification",
    label: "Qualification",
    required: true,
    hint: "QUALIFIED, NOT_QUALIFIED, or IRRELEVANT",
  },
  {
    key: "lead_score",
    label: "Lead score",
    required: false,
    hint: "0–100 or leave blank",
  },
  {
    key: "date_added",
    label: "Date added",
    required: false,
    hint: "YYYY/MM/DD (optional backfill; not in the future)",
  },
  { key: "notes", label: "Notes", required: false },
];

/** Sample row for docs / template (matches form defaults where applicable). */
export const ANALYST_IMPORT_SAMPLE_ROW: Record<AnalystImportHeaderKey, string> =
  {
    portal_website: "CDRAustraliaHelp.com",
    lead_source: "META_WHATSAPP",
    full_name: "Rajesh Sharma",
    phone: "+919876543210",
    email: "rajesh@example.com",
    city: "Mumbai",
    source_other: "",
    qualification: QualificationStatus.QUALIFIED,
    lead_score: "30",
    date_added: "",
    notes: "Sample row — replace with your data",
  };

const SOURCE_VALUES = new Set(
  LEAD_SOURCE_OPTIONS.map((o) => o.value as LeadSourceValue),
);

const HEADER_ALIASES: Record<string, AnalystImportHeaderKey> = {
  websites_name: "portal_website",
  website_name: "portal_website",
  full_name: "full_name",
  "full name": "full_name",
  name: "full_name",
  lead_name: "full_name",
  "lead name": "full_name",
  phone: "phone",
  mobile: "phone",
  email: "email",
  lead_email: "email",
  city: "city",
  lead_source: "lead_source",
  leads_source: "lead_source",
  source: "lead_source",
  source_other: "source_other",
  "describe source": "source_other",
  describe_source: "source_other",
  portal_website: "portal_website",
  "portal website": "portal_website",
  website: "portal_website",
  qualification: "qualification",
  qualification_status: "qualification",
  status: "qualification",
  lead_score: "lead_score",
  score: "lead_score",
  date_added: "date_added",
  lead_added_date: "date_added",
  "date added": "date_added",
  notes: "notes",
};

function normalizeHeaderCell(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ /g, "_");
}

export function resolveImportHeaderKey(cell: string): AnalystImportHeaderKey | null {
  const n = normalizeHeaderCell(cell);
  if (n in HEADER_ALIASES) return HEADER_ALIASES[n];
  if ((ANALYST_IMPORT_HEADER_KEYS as readonly string[]).includes(n)) {
    return n as AnalystImportHeaderKey;
  }
  return null;
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** YYYY/MM/DD or YYYY-MM-DD -> local start-of-day, or null if invalid. */
export function parseLocalDateYmd(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d, 0, 0, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export type ParsedImportRow = {
  rowNumber: number;
  full_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  lead_source: LeadSourceValue;
  source_other: string | null;
  portal_website: string | null;
  qualification: string;
  lead_score: number | null;
  date_added: Date | undefined;
  notes: string | null;
};

export type RowParseResult =
  | { ok: true; row: ParsedImportRow }
  | { ok: false; rowNumber: number; error: string };

export function parseAnalystImportRow(
  rowNumber: number,
  raw: Partial<Record<AnalystImportHeaderKey, string>>,
): RowParseResult {
  const full_name = (raw.full_name ?? "").trim();
  const phone = (raw.phone ?? "").trim();
  const emailRaw = (raw.email ?? "").trim();
  const city = (raw.city ?? "").trim() || null;
  const lead_source = (raw.lead_source ?? "").trim() as LeadSourceValue;
  const source_other = (raw.source_other ?? "").trim() || null;
  const qualification = (raw.qualification ?? "").trim();
  const scoreRaw = (raw.lead_score ?? "").trim();
  const dateRaw = (raw.date_added ?? "").trim();
  const notes = (raw.notes ?? "").trim() || null;
  const portalRaw = (raw.portal_website ?? "").trim();

  if (!full_name) {
    return { ok: false, rowNumber, error: "Full name is required." };
  }
  if (!phone) {
    return { ok: false, rowNumber, error: "Phone is required." };
  }
  if (!SOURCE_VALUES.has(lead_source)) {
    return {
      ok: false,
      rowNumber,
      error: `Invalid lead_source. Use one of: ${[...SOURCE_VALUES].join(", ")}.`,
    };
  }
  if (emailRaw && !isValidEmail(emailRaw)) {
    return { ok: false, rowNumber, error: "Invalid email." };
  }
  if (
    qualification !== QualificationStatus.QUALIFIED &&
    qualification !== QualificationStatus.NOT_QUALIFIED &&
    qualification !== QualificationStatus.IRRELEVANT
  ) {
    return {
      ok: false,
      rowNumber,
      error:
        "qualification must be QUALIFIED, NOT_QUALIFIED, or IRRELEVANT.",
    };
  }

  let lead_score: number | null = null;
  if (scoreRaw !== "") {
    const n = Number.parseInt(scoreRaw, 10);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      return {
        ok: false,
        rowNumber,
        error: "lead_score must be between 0 and 100 or blank.",
      };
    }
    lead_score = n;
  }

  let date_added: Date | undefined;
  if (dateRaw) {
    const parsed = parseLocalDateYmd(dateRaw);
    if (!parsed) {
      return { ok: false, rowNumber, error: "date_added must be YYYY/MM/DD." };
    }
    if (parsed > startOfTodayLocal()) {
      return {
        ok: false,
        rowNumber,
        error: "date_added cannot be in the future.",
      };
    }
    date_added = parsed;
  }

  let portal_website: string | null = null;
  if (portalRaw) {
    const canon = normalizePortalWebsitePreset(portalRaw);
    if (!canon) {
      return {
        ok: false,
        rowNumber,
        error:
          "websites_name / portal preset must match the Add Lead list, or leave blank.",
      };
    }
    portal_website = canon;
  }

  return {
    ok: true,
    row: {
      rowNumber,
      full_name,
      phone,
      email: emailRaw || null,
      city,
      lead_source,
      source_other,
      portal_website,
      qualification,
      lead_score,
      date_added,
      notes,
    },
  };
}

export function buildStoredSource(
  lead_source: LeadSourceValue,
  source_other: string | null,
): string {
  return deriveLeadSourceFromImportExtras(lead_source, source_other).source;
}
