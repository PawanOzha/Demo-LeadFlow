import { dbQuery, dbQueryOne } from "@/lib/db/pool";

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function normalizePage(raw: unknown): number {
  const n =
    typeof raw === "number"
      ? raw
      : Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function normalizeLimit(raw: unknown, fallback = 100): number {
  const n =
    typeof raw === "number"
      ? raw
      : Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  const floored = Math.floor(n);
  if (floored < 10) return 10;
  if (floored > 500) return 500;
  return floored;
}

export async function paginatedQuery<T>(
  sql: string,
  countSql: string,
  params: unknown[],
  page: number,
  limit: number,
): Promise<PaginatedResult<T>> {
  const safePage = normalizePage(page);
  const safeLimit = normalizeLimit(limit, 100);
  const [rows, countRow] = await Promise.all([
    dbQuery<T>(sql, params),
    dbQueryOne<{ total: string }>(countSql, params),
  ]);
  const total = Number.parseInt(countRow?.total ?? "0", 10) || 0;
  return {
    rows,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}
