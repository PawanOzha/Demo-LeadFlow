/** Currency codes supported for deal values (stored on Lead.dealCurrency). */
export const DEAL_CURRENCY_OPTIONS = [
  { code: "USD", label: "USD — US dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British pound" },
  { code: "INR", label: "INR — Indian rupee" },
  { code: "NPR", label: "NPR — Nepalese rupee" },
  { code: "AUD", label: "AUD — Australian dollar" },
  { code: "CAD", label: "CAD — Canadian dollar" },
] as const;

export type DealCurrencyCode = (typeof DEAL_CURRENCY_OPTIONS)[number]["code"];

const CODE_SET = new Set<string>(
  DEAL_CURRENCY_OPTIONS.map((o) => o.code),
);

export function normalizeDealCurrency(raw: string | undefined | null): string {
  const c = (raw ?? "USD").trim().toUpperCase();
  return CODE_SET.has(c) ? c : "USD";
}

/** Parse optional money from form text; returns null if blank. */
export function parseOptionalMoney(raw: string): {
  ok: true;
  value: number | null;
} | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  const cleaned = t.replace(/,/g, "");
  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return { ok: false, error: "Enter a valid amount." };
  }
  if (n < 0) return { ok: false, error: "Amount cannot be negative." };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

export function parseRequiredMoney(raw: string): number | { error: string } {
  const t = raw.trim();
  if (!t) return { error: "Amount is required." };
  const cleaned = t.replace(/,/g, "");
  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return { error: "Enter a valid amount." };
  }
  if (n <= 0) return { error: "Enter an amount greater than zero." };
  return Math.round(n * 100) / 100;
}

/** Normalize DB / RPC numeric (may be string). */
export function coerceMoney(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatDealMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount == null || amount === "") return "—";
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "—";
  const cur = normalizeDealCurrency(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${cur}`;
  }
}
