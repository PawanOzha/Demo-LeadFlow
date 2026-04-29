import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { dbQueryOne } from "@/lib/db/pool";
import {
  canUsePortalSettings,
  runPortalProfileUpdate,
} from "@/lib/server/user-settings";
import { forbidCrossOriginPost } from "@/lib/api-same-origin";

export const runtime = "nodejs";

/** JSON for client-only settings pages (avoids RSC/Flight issues on some routes). */
export async function GET() {
  const session = await getSession();
  if (!session || !canUsePortalSettings(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await dbQueryOne<{
    name: string;
    image: string | null;
    updatedAt: Date;
    teamName: string | null;
  }>(
    `SELECT u.name, u.image, u."updatedAt", t.name AS "teamName"
     FROM "User" u
     LEFT JOIN "Team" t ON t.id = u."teamId"
     WHERE u.id = $1`,
    [session.id],
  );
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: user.name,
    image: user.image,
    teamName: user.teamName,
    updatedAt: user.updatedAt.toISOString(),
  });
}

/** Profile/photo update via plain fetch (no Server Actions). */
export async function POST(request: NextRequest) {
  const blocked = forbidCrossOriginPost(request);
  if (blocked) return blocked;
  try {
    const session = await getSession();
    if (!session || !canUsePortalSettings(session.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const result = await runPortalProfileUpdate(formData);
    if ("error" in result) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/me/settings", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
