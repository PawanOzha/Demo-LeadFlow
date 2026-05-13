import { dbQuery } from "@/lib/db/pool";
import { SQL_RPC_SAFE_PAGE_SIZE } from "@/lib/db/sql-rpc-page-size";

/**
 * Runs a SELECT that already includes ORDER BY, appending LIMIT/OFFSET in pages
 * small enough for SQL RPC row caps. Stops after `maxRows` rows or no more data.
 */
export async function dbQueryPagedSelect<T>(
  orderedSelectSql: string,
  baseParams: unknown[],
  maxRows: number,
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  while (out.length < maxRows) {
    const limIdx = baseParams.length + 1;
    const offIdx = baseParams.length + 2;
    const batch = await dbQuery<T>(
      `${orderedSelectSql} LIMIT ($${limIdx})::bigint OFFSET ($${offIdx})::bigint`,
      [...baseParams, SQL_RPC_SAFE_PAGE_SIZE, offset],
    );
    if (batch.length === 0) break;
    for (const row of batch) {
      if (out.length >= maxRows) break;
      out.push(row);
    }
    offset += batch.length;
    if (batch.length < SQL_RPC_SAFE_PAGE_SIZE) break;
  }
  return out;
}
