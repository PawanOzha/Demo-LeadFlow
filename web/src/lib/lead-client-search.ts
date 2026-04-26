const MAX_LEN = 200;

/** Instant client-side filter: name/phone substring (case-insensitive); 2+ digits also match phone digits only. */
export function filterLeadsByNameOrPhone<
  T extends { leadName: string; phone: string | null },
>(leads: T[], rawQuery: string): T[] {
  const qRaw = rawQuery.trim();
  if (!qRaw) return leads;
  const qLower = qRaw.toLowerCase();
  const qDigits = qRaw.replace(/\D/g, "");
  return leads.filter((l) => {
    const name = (l.leadName || "").toLowerCase();
    const phoneStr = (l.phone || "").toLowerCase();
    if (name.includes(qLower) || phoneStr.includes(qLower)) return true;

    if (qDigits.length >= 2 && l.phone) {
      const phoneDigits = l.phone.replace(/\D/g, "");
      if (phoneDigits.includes(qDigits)) return true;

      // Match local phone searches against stored international phone formats.
      if (qDigits.startsWith("0") && phoneDigits.endsWith(qDigits.slice(1))) {
        return true;
      }
    }
    return false;
  });
}

export function normalizeClientSearchQuery(
  raw: string | string[] | undefined | null,
): string | null {
  if (raw == null) return null;
  const scalar = Array.isArray(raw) ? raw[0] : raw;
  if (scalar == null) return null;
  const t = String(scalar).trim();
  if (!t) return null;
  return t.length > MAX_LEN ? t.slice(0, MAX_LEN) : t;
}
