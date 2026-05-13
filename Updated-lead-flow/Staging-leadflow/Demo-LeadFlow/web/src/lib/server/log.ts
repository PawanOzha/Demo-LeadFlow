import "server-only";

/** Structured server logging; never log secrets. */
export const logger = {
  error(message: string, context?: Record<string, unknown>) {
    if (context && Object.keys(context).length > 0) {
      console.error(message, context);
    } else {
      console.error(message);
    }
  },
};

/** Safe server-side logging: never log secrets; keep messages short in production. */
export function logSessionOrDataError(context: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (process.env.NODE_ENV === "development") {
    console.error(`[LeadFlow:${context}]`, err);
  } else {
    console.error(`[LeadFlow:${context}]`, msg);
  }
}

function isRouteTimingEnabled(): boolean {
  const raw = (process.env.LEADFLOW_ROUTE_TIMING ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/**
 * Lightweight route timing logger.
 * Enable with `LEADFLOW_ROUTE_TIMING=1` in server env.
 */
export async function timedServerBlock<T>(
  label: string,
  run: () => Promise<T>,
): Promise<T> {
  if (!isRouteTimingEnabled()) return run();
  const started = process.hrtime.bigint();
  try {
    return await run();
  } finally {
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    console.info(`[LeadFlow:timing] ${label} ${elapsedMs.toFixed(1)}ms`);
  }
}

function isLeadsAuditEnabled(): boolean {
  const raw = (process.env.LEADFLOW_LEADS_AUDIT ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Optional structured server log for list filters/paging audits. */
export function logLeadsAudit(label: string, payload: Record<string, unknown>) {
  if (!isLeadsAuditEnabled()) return;
  try {
    console.info(`[LeadFlow:leads-audit] ${label} ${JSON.stringify(payload)}`);
  } catch {
    console.info(`[LeadFlow:leads-audit] ${label}`);
  }
}

/** Structured log when `exec_sql` returns an unexpected row shape (safe for prod: no secrets). */
export function logExecSqlUnexpectedRowShape(
  rpc: string,
  raw: unknown,
  detail?: string,
) {
  let rawPreview: string;
  try {
    rawPreview =
      raw === undefined || raw === null
        ? String(raw)
        : JSON.stringify(raw).slice(0, 500);
  } catch {
    rawPreview = String(raw).slice(0, 500);
  }
  console.error("[LeadFlow:exec_sql] unexpected row shape", {
    rpc,
    rawType: typeof raw,
    rawPreview,
    detail,
  });
}

export function logLeadDashboardStatsSchemaMismatch(issues: unknown) {
  console.error("[LeadFlow:dashboard-stats] schema validation failed", {
    issues,
  });
}
