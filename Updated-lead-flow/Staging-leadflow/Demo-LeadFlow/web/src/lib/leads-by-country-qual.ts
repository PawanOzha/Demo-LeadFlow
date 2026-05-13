import { parsePhoneNumber } from "libphonenumber-js";
import { QualificationStatus } from "@/lib/constants";
import { resolveLeadCity, resolveLeadCountry } from "@/lib/phone-location";

export type CountryQualRow = {
  iso: string;
  label: string;
  q: number;
  nq: number;
  ir: number;
  total: number;
};

type CountryQual = { q: number; nq: number; ir: number };

export function countryLabelForIso(iso: string): string {
  if (iso === "__none__") return "No phone";
  if (iso === "__invalid__") return "Invalid / unknown number";
  // Intl.DisplayNames.of throws RangeError for some inputs (e.g. single char) in V8/Node.
  if (!/^[A-Za-z]{2}$/.test(iso.trim())) {
    return iso.trim() || "—";
  }
  const code = iso.trim().toUpperCase();
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    return name ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

/** ISO region code from E.164 phone, or sentinel keys for missing/invalid (same buckets as country report). */
export function leadPhoneCountryIso(phone: string | null): string {
  const raw = phone?.trim();
  if (!raw) return "__none__";
  try {
    const parsed = parsePhoneNumber(raw);
    return parsed.country ?? "__invalid__";
  } catch {
    return "__invalid__";
  }
}

/**
 * Stable bucket for geography / conversion: prefer phone-derived ISO, else stored `Lead.country`,
 * then invalid / no-signal buckets (matches `resolveLeadCountry` intent in city rollups).
 */
export function countryQualGroupKey(
  phone: string | null | undefined,
  storedCountry: string | null | undefined,
): string {
  const rawPhone = phone?.trim();
  if (rawPhone) {
    try {
      const parsed = parsePhoneNumber(rawPhone);
      if (parsed.country) return `iso:${parsed.country}`;
    } catch {
      /* fall through */
    }
  }
  const st = storedCountry?.trim();
  if (st) return `txt:${st.toLowerCase()}`;
  if (rawPhone) return `iso:__invalid__`;
  return `iso:__none__`;
}

function textBucketFallbackLabel(lowerKey: string): string {
  return lowerKey
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Single display label for dashboards / conversion rows (same bucketing as {@link buildCountryQualRows}). */
export function countryDimLabelForLead(l: {
  phone: string | null;
  country?: string | null;
}): string {
  const key = countryQualGroupKey(l.phone, l.country ?? null);
  if (key.startsWith("iso:")) return countryLabelForIso(key.slice(4));
  if (key.startsWith("txt:")) {
    const trimmed = l.country?.trim();
    if (trimmed) return trimmed;
    return textBucketFallbackLabel(key.slice(4));
  }
  return countryLabelForIso("__none__");
}

function bumpCountryQual(row: CountryQual, status: string) {
  if (status === QualificationStatus.QUALIFIED) row.q += 1;
  else if (status === QualificationStatus.NOT_QUALIFIED) row.nq += 1;
  else if (status === QualificationStatus.IRRELEVANT) row.ir += 1;
}

/** Aggregate leads by country (phone ISO when possible, else stored country) with Q/NQ/IR counts. */
export function buildCountryQualRows(
  leads: {
    phone: string | null;
    country?: string | null;
    qualificationStatus: string;
  }[],
): CountryQualRow[] {
  const byKey = new Map<string, { label: string } & CountryQual>();
  for (const l of leads) {
    const key = countryQualGroupKey(l.phone, l.country ?? null);
    if (!byKey.has(key)) {
      let label: string;
      if (key.startsWith("iso:")) {
        label = countryLabelForIso(key.slice(4));
      } else if (key.startsWith("txt:")) {
        label = l.country?.trim() || textBucketFallbackLabel(key.slice(4));
      } else {
        label = countryLabelForIso("__none__");
      }
      byKey.set(key, { label, q: 0, nq: 0, ir: 0 });
    }
    const row = byKey.get(key)!;
    bumpCountryQual(row, l.qualificationStatus);
  }
  return [...byKey.entries()]
    .map(([groupKey, v]) => ({
      iso: groupKey,
      label: v.label,
      q: v.q,
      nq: v.nq,
      ir: v.ir,
      total: v.q + v.nq + v.ir,
    }))
    .sort((a, b) => b.total - a.total);
}

export type CityCountRow = { label: string; count: number };

/**
 * Aggregate leads by stored city + phone-derived country (same key as superadmin report).
 * Used on analyst dashboard report and CSV/PDF export — not shown on lead list tables.
 */
export function buildAnalystCityRows(
  leads: { phone: string | null; country: string | null; city: string | null }[],
): CityCountRow[] {
  const byCity = new Map<string, number>();
  for (const l of leads) {
    const c = resolveLeadCountry(l.country, l.phone);
    const city = resolveLeadCity(l.city);
    const key = `${city} · ${c}`;
    byCity.set(key, (byCity.get(key) ?? 0) + 1);
  }
  return [...byCity.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}
