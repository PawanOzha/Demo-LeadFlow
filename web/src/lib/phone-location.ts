import { parsePhoneNumberFromString } from "libphonenumber-js";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** Best-effort country display name from E.164 or international phone string. */
export function countryNameFromPhone(
  phone: string | null | undefined,
): string | null {
  if (!phone?.trim()) return null;
  try {
    const p = parsePhoneNumberFromString(phone.trim());
    if (!p?.country) return null;
    return regionNames.of(p.country) ?? p.country;
  } catch {
    return null;
  }
}

/** Prefer stored country; else derive from phone. */
export function resolveLeadCountry(
  stored: string | null | undefined,
  phone: string | null | undefined,
): string {
  if (stored?.trim()) return stored.trim();
  return countryNameFromPhone(phone) ?? "Unknown";
}

/** Prefer stored city; else unknown for reporting. */
export function resolveLeadCity(stored: string | null | undefined): string {
  if (stored?.trim()) return stored.trim();
  return "—";
}
