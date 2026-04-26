import "server-only";

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
