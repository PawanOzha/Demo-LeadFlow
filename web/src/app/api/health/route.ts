import { NextResponse } from "next/server";

/**
 * Liveness probe for Railway / load balancers — no database or Supabase calls.
 * Configure Railway → Settings → Healthcheck path: /api/health
 */
export function GET() {
  return NextResponse.json(
    { ok: true, service: "leadflow-web" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
