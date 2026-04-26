import { NextRequest, NextResponse } from "next/server";

/** Reject cross-origin browser requests when Origin is present and does not match Host. */
export function forbidCrossOriginPost(req: NextRequest): NextResponse | null {
  if (req.method !== "POST") return null;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return null;
  try {
    if (new URL(origin).host !== host) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return null;
}
