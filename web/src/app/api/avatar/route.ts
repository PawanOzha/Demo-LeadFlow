import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const extRaw = (req.nextUrl.searchParams.get("ext") ?? "jpg").toLowerCase();
  const ext = extRaw === "jpeg" ? "jpg" : extRaw;
  if (ext !== "jpg" && ext !== "png") {
    return new NextResponse("Bad request", { status: 400 });
  }

  const cwd = process.cwd();
  const privatePath = path.join(cwd, "private-uploads", `${session.id}.${ext}`);
  const legacyPublicPath = path.join(
    cwd,
    "public",
    "uploads",
    `${session.id}.${ext}`,
  );

  let filePath: string | null = null;
  if (existsSync(privatePath)) filePath = privatePath;
  else if (existsSync(legacyPublicPath)) filePath = legacyPublicPath;

  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await readFile(filePath);
    const contentType = MIME[ext] ?? "image/jpeg";
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        // Avoid stale avatars in the shell after the user replaces the same URL (e.g. jpg → jpg).
        "Cache-Control": "private, no-store, must-revalidate",
      },
    });
  } catch (e) {
    console.error("[api/avatar] read error:", e);
    return new NextResponse("Not found", { status: 404 });
  }
}
