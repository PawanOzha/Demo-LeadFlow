import "server-only";

import { createSupabaseAdminClient } from "@/lib/auth/supabase-admin";
import { ExecSqlShapeError } from "@/lib/db/exec-sql-errors";
import { peelExecSqlRpcEnvelope } from "@/lib/db/normalize-exec-sql-row";
import { logExecSqlUnexpectedRowShape } from "@/lib/server/log";

type QueryResult<T = Record<string, unknown>> = {
  rows: T[];
};

type QueryRunner = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<QueryResult<T>>;
};

const DATE_FIELD_KEY = /(?:At|_at)$/;

function reviveDateIfNeeded(key: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (!DATE_FIELD_KEY.test(key)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d;
}

function reviveRowDates(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => reviveRowDates(item));
  }
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (Array.isArray(v) || (v && typeof v === "object")) {
      out[k] = reviveRowDates(v);
      continue;
    }
    out[k] = reviveDateIfNeeded(k, v);
  }
  return out;
}

/**
 * PostgREST / Supabase RPC `setof jsonb` payloads sometimes arrive as:
 * - decoded objects (preferred)
 * - JSON strings containing an object/array (still needs `JSON.parse` on each row)
 * - a `{ rows: [...] }` envelope (handled earlier in {@link runSql})
 */
function reviveRows<T>(rows: unknown[]): T[] {
  const rpc = sqlRpcName();
  return rows.map((row, index) => {
    const peeled = peelExecSqlRpcEnvelope(rpc, row);
    if (peeled === null) {
      logExecSqlUnexpectedRowShape(rpc, row, `row index ${index}`);
      throw new ExecSqlShapeError(
        `exec_sql returned an unexpected row shape (rpc=${rpc}, index=${index})`,
      );
    }
    return reviveRowDates(peeled) as T;
  });
}

function coerceRpcPayloadToRowArray(payload: unknown): unknown[] | null {
  if (payload == null) return null;
  if (typeof payload === "string") {
    try {
      const trimmed = payload.trim();
      const parsed =
        trimmed.startsWith("{") || trimmed.startsWith("[")
          ? JSON.parse(trimmed)
          : null;
      if (parsed != null)
        return coerceRpcPayloadToRowArray(parsed);
    } catch {
      return null;
    }
    return null;
  }
  if (!Array.isArray(payload)) return null;
  return payload;
}

function sqlRpcName(): string {
  return process.env.SUPABASE_SQL_RPC_NAME?.trim() || "exec_sql";
}

function sqlTxRpcName(): string {
  return process.env.SUPABASE_SQL_TX_RPC_NAME?.trim() || "exec_sql_batch_tx";
}

function normalizeParam(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  /** Keep native JSON arrays so each `$n` binds JSON text parsed as `::jsonb` in SQL (`ARRAY(SELECT jsonb_array_elements_text(...))` for `ANY()`). */
  if (Array.isArray(value))
    return value.map((entry) =>
      typeof entry === "undefined" ? null : entry,
    );
  return value;
}

/** Unpack `$n::jsonb` params from RPC `query_params` for `WHERE col = ANY(...)`. */
export function rpcJsonParamTextArrayUnpack(n: number): string {
  return `ARRAY(SELECT jsonb_array_elements_text(($${n})::jsonb))`;
}

/** True only for a single-column COUNT(*) … FROM (what /api/health/db uses). */
function sqlLooksLikeSingletonCountStar(sql: string): boolean {
  const flat = sql.slice(0, 2000).replace(/\s+/g, " ");
  if (!/^\s*SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(flat)) return false;
  if (/\bGROUP\s+BY\b/i.test(flat)) return false;
  const fromIdx = flat.search(/\bFROM\b/i);
  if (fromIdx === -1) return false;
  const selectList = flat.slice(0, fromIdx).replace(/^\s*SELECT\s+/i, "");
  let depth = 0;
  for (let i = 0; i < selectList.length; i++) {
    const c = selectList[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) return false;
  }
  return true;
}

function finalizeRpcRows<T>(
  queryText: string,
  rows: T[],
): T[] {
  if (
    rows.length === 0 &&
    sqlLooksLikeSingletonCountStar(queryText)
  ) {
    throw new Error(
      `Supabase SQL RPC (${sqlRpcName()}) returned no rows for a singleton COUNT(*) query. ` +
        `The UI would show 0 leads. Check that this server uses the same SUPABASE_* keys as your DB, ` +
        `that function "${sqlRpcName()}" exists and returns JSON rows, and that you are querying project "${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "?"}".`,
    );
  }
  return rows;
}

function extractRpcRowsPayload(payload: unknown): unknown[] | null {
  const directArray = coerceRpcPayloadToRowArray(payload);
  if (directArray) return directArray;
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    !("rows" in (payload as object))
  ) {
    return [payload];
  }
  return null;
}

async function runSql<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const admin = createSupabaseAdminClient();
  const normalizedParams = (params ?? []).map(normalizeParam);
  const rpcText = text.replace(/\r/g, "").trimStart();
  const { data, error } = await admin.rpc(sqlRpcName(), {
    query_text: rpcText,
    query_params: normalizedParams,
  });
  if (error) {
    throw new Error(`Supabase SQL RPC failed: ${error.message}`);
  }
  if (typeof data === "string") {
    try {
      const trimmed = data.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        throw new Error(`Supabase SQL RPC returned non-object string. rpc=${sqlRpcName()}`);
      }
      const parsed = JSON.parse(trimmed) as unknown;
      const extracted = extractRpcRowsPayload(parsed);
      if (!extracted) {
        throw new Error(
          `Supabase SQL RPC returned string payload with unexpected shape. rpc=${sqlRpcName()}`,
        );
      }
      const rows = extracted;
      const normalizedRows = reviveRows<T>(rows);
      return finalizeRpcRows(rpcText, normalizedRows);
    } catch (parseError) {
      throw new Error(
        `Supabase SQL RPC returned invalid JSON string payload. rpc=${sqlRpcName()} error=${parseError instanceof Error ? parseError.message : "unknown"}`,
      );
    }
  }
  if (data && typeof data === "object" && "rows" in data) {
    const rows = (data as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      const normalizedRows = reviveRows<T>(rows);
      return finalizeRpcRows(rpcText, normalizedRows);
    }
    throw new Error(
      `Supabase SQL RPC returned object payload without array rows. rpc=${sqlRpcName()}`,
    );
  }
  const extractedNonString = extractRpcRowsPayload(data);
  if (!extractedNonString) {
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      !("rows" in data)
    ) {
      const normalizedRows = reviveRows<T>([data as Record<string, unknown>]);
      return finalizeRpcRows(rpcText, normalizedRows);
    }
    throw new Error(
      `Supabase SQL RPC returned unsupported payload type (${typeof data}). rpc=${sqlRpcName()}`,
    );
  }
  const rows = extractedNonString;
  const normalizedRows = reviveRows<T>(rows);
  return finalizeRpcRows(rpcText, normalizedRows);
}

async function runSqlBatchTransaction(
  statements: Array<{ query_text: string; query_params: unknown[] }>,
): Promise<void> {
  if (statements.length === 0) return;
  const admin = createSupabaseAdminClient();
  const normalized = statements.map((s) => ({
    query_text: s.query_text.replace(/\r/g, "").trimStart(),
    query_params: s.query_params,
  }));
  const { error } = await admin.rpc(sqlTxRpcName(), { statements: normalized });
  if (error) {
    throw new Error(`Supabase SQL TX RPC failed: ${error.message}`);
  }
}

/** Run a query; returns all rows. */
export async function dbQuery<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  return runSql<T>(text, params);
}

/** Single row or null. */
export async function dbQueryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await dbQuery<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: QueryRunner) => Promise<T>,
): Promise<T> {
  const statements: Array<{ query_text: string; query_params: unknown[] }> = [];

  const client: QueryRunner = {
    query: async <T = Record<string, unknown>>(text: string, params?: unknown[]) => {
      const normalizedParams = (params ?? []).map(normalizeParam);
      statements.push({ query_text: text, query_params: normalizedParams });
      // Existing transaction callsites in this codebase use write statements only.
      // Return empty rows to preserve shape without exposing partial execution.
      return { rows: [] as T[] };
    },
  };

  const result = await fn(client);
  await runSqlBatchTransaction(statements);
  return result;
}

export function newId(): string {
  return crypto.randomUUID();
}

export { ExecSqlShapeError } from "@/lib/db/exec-sql-errors";
