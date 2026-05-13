/**
 * Supabase `exec_sql`-style RPC payloads are often capped around 1000 rows per call.
 * Use a LIMIT strictly below that so "full page" means there may be more data, and
 * always advance OFFSET by the number of rows actually returned (never by the
 * requested LIMIT alone) to avoid skipping rows when the RPC returns fewer rows than asked.
 */
export const SQL_RPC_SAFE_PAGE_SIZE = 500;
