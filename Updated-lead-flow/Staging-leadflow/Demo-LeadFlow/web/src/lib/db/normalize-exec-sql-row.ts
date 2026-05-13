/**
 * Safe JSON parse for PostgREST / Supabase `setof jsonb` rows that sometimes arrive as strings.
 * Never throws; malformed JSON returns the original string so callers can fail with context.
 */
export function safeParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[pool] failed to parse JSON string:",
        String(value).slice(0, 200),
      );
    }
    return value;
  }
}

// Known RPC envelope keys that wrap the real row — unwrap these only.
// Never unwrap arbitrary single-key objects (e.g. { c: "56240" } is a
// legitimate COUNT result, not an envelope).
const RPC_ENVELOPE_KEYS = new Set(["row_to_json", "json_build_object"]);

/**
 * Production normalization: top-level string → object; unwrap only `row_to_json` /
 * `json_build_object` single-key envelopes.
 * Returns `null` if the value is not a plain object after parsing.
 */
export function normalizeExecSqlRow(row: unknown): Record<string, unknown> | null {
  // Step 1: parse if top-level is a JSON string
  const parsed = safeParseJson(row);

  // Step 2: must be a plain object
  if (
    parsed === null ||
    parsed === undefined ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  const keys = Object.keys(obj);

  // Step 3: only unwrap known RPC envelope keys
  // Do NOT unwrap arbitrary single-key objects like { c: "56240" }
  if (keys.length === 1 && RPC_ENVELOPE_KEYS.has(keys[0]!)) {
    const inner = safeParseJson(obj[keys[0]!]);
    if (
      inner !== null &&
      inner !== undefined &&
      typeof inner === "object" &&
      !Array.isArray(inner)
    ) {
      return inner as Record<string, unknown>;
    }
    return null;
  }

  return obj;
}

/**
 * Peels `exec_sql` / PostgREST envelopes (single-key rpc wrapper, repeated `row_to_json`)
 * until a stable plain object is reached — used for every row from `runSql`.
 */
export function peelExecSqlRpcEnvelope(
  rpcName: string,
  row: unknown,
): Record<string, unknown> | null {
  let cur: unknown = safeParseJson(row);

  if (cur === null || typeof cur !== "object" || Array.isArray(cur)) {
    return null;
  }

  for (let depth = 0; depth < 12; depth += 1) {
    const obj = cur as Record<string, unknown>;
    const keys = Object.keys(obj);

    const jboKey = keys.find((k) => /^json_build_object$/i.test(k));
    if (jboKey != null && obj[jboKey] != null) {
      const inner = safeParseJson(obj[jboKey]);
      if (inner !== null && typeof inner === "object" && !Array.isArray(inner)) {
        cur = inner;
        continue;
      }
      return null;
    }

    const rjKey = keys.find((k) => /^row_to_json$/i.test(k));
    if (rjKey != null && obj[rjKey] != null) {
      const inner = safeParseJson(obj[rjKey]);
      if (inner !== null && typeof inner === "object" && !Array.isArray(inner)) {
        cur = inner;
        continue;
      }
      return null;
    }

    if (keys.length === 1) {
      const k = keys[0]!;
      if (
        k === rpcName ||
        /^exec_sql(_batch_tx)?$/i.test(k) ||
        /^row_to_json$/i.test(k) ||
        /^json_build_object$/i.test(k)
      ) {
        const inner = safeParseJson(obj[k]);
        if (inner !== null && typeof inner === "object" && !Array.isArray(inner)) {
          cur = inner;
          continue;
        }
        return null;
      }
    }

    return obj;
  }

  return null;
}
