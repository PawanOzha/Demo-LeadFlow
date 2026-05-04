import { createSupabaseAdminClient } from "@/lib/auth/supabase-admin";

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

function reviveRows<T>(rows: unknown[]): T[] {
  return rows.map((row) => reviveRowDates(row) as T);
}

/**
 * Normalizes what Supabase `exec_sql` returns (`setof jsonb`) into a row array.
 * Handles: `[rows]`, `{ rows }`, a single row object, JSON strings, double-nested arrays,
 * and arrays of stringified JSON rows (some PostgREST paths).
 */
function normalizeExecSqlRpcResult(parsed: unknown): unknown[] {
  if (parsed == null) return [];

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return [];
    // Double-nested: [[ {...}, {...} ]]
    if (parsed.length === 1 && Array.isArray(parsed[0])) {
      return normalizeExecSqlRpcResult(parsed[0]);
    }
    // Each row is a JSON string
    if (parsed.every((x) => typeof x === "string")) {
      return parsed.map((s) => {
        try {
          return JSON.parse(s as string);
        } catch {
          return s;
        }
      });
    }
    return parsed;
  }

  if (typeof parsed === "object") {
    if ("rows" in parsed && Array.isArray((parsed as { rows?: unknown }).rows)) {
      return normalizeExecSqlRpcResult((parsed as { rows: unknown[] }).rows);
    }
    return [parsed];
  }

  return [];
}

function sqlRpcName(): string {
  return process.env.SUPABASE_SQL_RPC_NAME?.trim() || "exec_sql";
}

function sqlTxRpcName(): string {
  return process.env.SUPABASE_SQL_TX_RPC_NAME?.trim() || "exec_sql_batch_tx";
}

function normalizeParam(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    const items = value.map((v) => String(v).replace(/"/g, '\\"'));
    return `{${items.map((v) => `"${v}"`).join(",")}}`;
  }
  return value;
}

async function runSql<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const admin = createSupabaseAdminClient();
  const normalizedParams = (params ?? []).map(normalizeParam);
  const { data, error } = await admin.rpc(sqlRpcName(), {
    query_text: text,
    query_params: normalizedParams,
  });
  if (error) {
    throw new Error(`Supabase SQL RPC failed: ${error.message}`);
  }

  let payload: unknown = data;
  if (typeof data === "string") {
    try {
      payload = JSON.parse(data);
    } catch {
      return [];
    }
  }

  const rows = normalizeExecSqlRpcResult(payload);
  return reviveRows<T>(rows);
}

async function runSqlBatchTransaction(
  statements: Array<{ query_text: string; query_params: unknown[] }>,
): Promise<void> {
  if (statements.length === 0) return;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc(sqlTxRpcName(), { statements });
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
