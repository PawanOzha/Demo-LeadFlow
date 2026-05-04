import { normalizeClientSearchQuery } from "@/lib/lead-client-search";

/** Escape `%`, `_`, and `\` for PostgreSQL `LIKE` / `ILIKE … ESCAPE '\\'`. */
export function escapePostgresLikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function colRef(leadAlias: string | undefined, column: string): string {
  return leadAlias ? `${leadAlias}."${column}"` : `"${column}"`;
}

/**
 * AND-merge a name/phone search into an existing lead WHERE clause.
 * Mirrors {@link filterLeadsByNameOrPhone} on the server (ILIKE + digit‑only phone match).
 */
export function mergeLeadNamePhoneSearch(
  base: { clause: string; params: unknown[] },
  leadAlias: string | undefined,
  q: string | null | undefined,
): { clause: string; params: unknown[] } {
  const t = normalizeClientSearchQuery(
    q == null ? null : typeof q === "string" ? q : String(q),
  );
  if (!t) {
    return { clause: base.clause, params: [...base.params] };
  }

  const params = [...base.params];
  const esc = escapePostgresLikePattern(t);
  const ilikePattern = `%${esc}%`;
  const ilikeIdx = params.length + 1;
  params.push(ilikePattern);
  const pi = `$${ilikeIdx}`;

  const c = (col: string) => colRef(leadAlias, col);

  const parts: string[] = [
    `${c("leadName")} ILIKE ${pi} ESCAPE '\\'`,
    `COALESCE(${c("phone")}, '') ILIKE ${pi} ESCAPE '\\'`,
  ];

  const qDigits = t.replace(/\D/g, "");
  if (qDigits.length >= 2) {
    const digitPat = `%${qDigits}%`;
    params.push(digitPat);
    const pd = `$${params.length}`;
    parts.push(
      `regexp_replace(COALESCE(${c("phone")}, ''), '\\D', '', 'g') LIKE ${pd}`,
    );
    if (qDigits.startsWith("0") && qDigits.length >= 2) {
      const suffix = qDigits.slice(1);
      params.push(`%${suffix}%`);
      const ps = `$${params.length}`;
      parts.push(
        `regexp_replace(COALESCE(${c("phone")}, ''), '\\D', '', 'g') LIKE ${ps}`,
      );
    }
  }

  const searchClause = `(${parts.join(" OR ")})`;
  return {
    clause: `(${base.clause}) AND ${searchClause}`,
    params,
  };
}
