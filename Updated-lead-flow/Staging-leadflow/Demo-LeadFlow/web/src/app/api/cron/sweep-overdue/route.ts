import { NextRequest, NextResponse } from "next/server";
import { sweepOverdueLeadsGlobal } from "@/lib/deadline";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  await sweepOverdueLeadsGlobal();
  return NextResponse.json({ ok: true });
}
