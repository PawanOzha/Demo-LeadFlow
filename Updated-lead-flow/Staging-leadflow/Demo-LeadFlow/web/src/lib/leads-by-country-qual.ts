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

function bumpCountryQual(row: CountryQual, status: string) {
  if (status === QualificationStatus.QUALIFIED) row.q += 1;
  else if (status === QualificationStatus.NOT_QUALIFIED) row.nq += 1;
  else if (status === QualificationStatus.IRRELEVANT) row.ir += 1;
}

/** Aggregate leads by phone country with qualified / not qualified / irrelevant counts (sorted by total). */
export function buildCountryQualRows(
  leads: { phone: string | null; qualificationStatus: string }[],
): CountryQualRow[] {
  const byCountryQual = new Map<string, CountryQual>();
  for (const l of leads) {
    const iso = leadPhoneCountryIso(l.phone);
    const row = byCountryQual.get(iso) ?? { q: 0, nq: 0, ir: 0 };
    bumpCountryQual(row, l.qualificationStatus);
    byCountryQual.set(iso, row);
  }
  return [...byCountryQual.entries()]
    .map(([iso, v]) => ({
      iso,
      label: countryLabelForIso(iso),
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
