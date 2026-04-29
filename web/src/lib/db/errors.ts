/** True when Postgres is unreachable (wrong URL, firewall, paused project, TLS issues, etc.). */
export function isDbConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Can't reach database server|P1001|P1017|connection refused|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|ENETUNREACH|timeout expired|the database system is starting up|SSL|TLS|certificate|Connection terminated|server closed the connection unexpectedly|no pg_hba\.conf entry for host/i.test(
    msg,
  );
}

/** Wrong database password / auth rejection from backend SQL execution. */
export function isDbPasswordAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /password authentication failed|28P01|authentication failed/i.test(msg);
}
