/**
 * SQL OR-group for lead list search: name (raw + space-insensitive), email, phone (raw + digits-only).
 * Matches partial phone queries (e.g. "156" → "15679533", "+1 567-9533") and names with flexible spacing.
 */

export type LeadSmartSearchSql = {
  clause: string;
  params: unknown[];
  nextIndex: number;
};

function leadColumnExpr(
  tableAlias: string | null | undefined,
  col: "leadName" | "phone" | "leadEmail",
): string {
  const prefix = tableAlias?.trim() ? `${tableAlias.trim()}.` : "";
  if (col === "leadName") return `${prefix}"leadName"`;
  if (col === "leadEmail") return `${prefix}"leadEmail"`;
  return `${prefix}phone`;
}

/**
 * @param paramStartIndex - first `$n` index for bound parameters (uses up to two: full query + digit run).
 */
export function buildLeadSmartSearchOrClause(
  rawQ: string,
  paramStartIndex: number,
  tableAlias?: string | null,
): LeadSmartSearchSql | null {
  const trimmed = rawQ.trim();
  if (!trimmed) return null;

  const name = leadColumnExpr(tableAlias, "leadName");
  const phone = leadColumnExpr(tableAlias, "phone");
  const email = leadColumnExpr(tableAlias, "leadEmail");

  const i = paramStartIndex;
  const j = paramStartIndex + 1;

  const qDigits = trimmed.replace(/\D/g, "");

  const nameRaw = `strpos(lower(COALESCE(${name}, '')), lower($${i}::text)) > 0`;
  const nameFolded = `strpos(
      regexp_replace(lower(COALESCE(${name}, '')), '[[:space:]]', '', 'g'),
      regexp_replace(lower($${i}::text), '[[:space:]]', '', 'g')
    ) > 0`;
  const emailRaw = `strpos(lower(COALESCE(${email}, '')), lower($${i}::text)) > 0`;
  const phoneRaw = `strpos(lower(COALESCE(${phone}, '')), lower($${i}::text)) > 0`;

  const parts = [nameRaw, nameFolded, emailRaw, phoneRaw];

  if (qDigits.length > 0) {
    parts.push(
      `strpos(
        NULLIF(regexp_replace(COALESCE(${phone}, ''), '\\D', '', 'g'), ''),
        $${j}::text
      ) > 0`,
    );
  }

  return {
    clause: `(${parts.join("\n    OR ")})`,
    params: qDigits.length > 0 ? [trimmed, qDigits] : [trimmed],
    nextIndex: qDigits.length > 0 ? j + 1 : i + 1,
  };
}
