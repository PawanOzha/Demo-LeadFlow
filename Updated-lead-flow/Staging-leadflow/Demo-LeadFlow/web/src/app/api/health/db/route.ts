import { NextResponse } from "next/server";
import { dbQueryOne } from "@/lib/db/pool";

/**
 * Database connectivity probe — hits the same path as portal pages (`exec_sql` RPC).
 * Use after deploy: GET /api/health/db → `{ ok, leadCount, supabaseHost, rpc }`.
 */
export async function GET() {
  try {
    const row = await dbQueryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "Lead"`,
    );
    const leadCount = Number(row?.c ?? NaN);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    let supabaseHost: string | null = null;
    try {
      supabaseHost = new URL(url).hostname;
    } catch {
      supabaseHost = null;
    }

    return NextResponse.json(
      {
        ok: true,
        leadCount: Number.isFinite(leadCount) ? leadCount : null,
        supabaseHost,
        rpc: process.env.SUPABASE_SQL_RPC_NAME?.trim() || "exec_sql",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        rpc: process.env.SUPABASE_SQL_RPC_NAME?.trim() || "exec_sql",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
