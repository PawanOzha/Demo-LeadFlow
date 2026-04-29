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

const FALLBACK_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="Avatar"><rect width="128" height="128" fill="#f3f4f6"/><circle cx="64" cy="48" r="22" fill="#9ca3af"/><path d="M20 112c6-20 22-32 44-32s38 12 44 32" fill="#9ca3af"/></svg>`;

export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const extRaw = (req.nextUrl.searchParams.get("ext") ?? "jpg").toLowerCase();
  const requestedExt = extRaw === "jpeg" ? "jpg" : extRaw;
  if (requestedExt !== "jpg" && requestedExt !== "png") {
    return new NextResponse("Bad request", { status: 400 });
  }

  const cwd = process.cwd();
  const extOrder: ("jpg" | "png")[] =
    requestedExt === "jpg" ? ["jpg", "png"] : ["png", "jpg"];
  let filePath: string | null = null;
  let servedExt: "jpg" | "png" = requestedExt;
  for (const ext of extOrder) {
    const privatePath = path.join(cwd, "private-uploads", `${session.id}.${ext}`);
    const legacyPublicPath = path.join(
      cwd,
      "public",
      "uploads",
      `${session.id}.${ext}`,
    );
    if (existsSync(privatePath)) {
      filePath = privatePath;
      servedExt = ext;
      break;
    }
    if (existsSync(legacyPublicPath)) {
      filePath = legacyPublicPath;
      servedExt = ext;
      break;
    }
  }

  if (!filePath) {
    return new NextResponse(FALLBACK_AVATAR_SVG, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, no-store, must-revalidate",
      },
    });
  }

  try {
    const file = await readFile(filePath);
    const contentType = MIME[servedExt] ?? "image/jpeg";
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
