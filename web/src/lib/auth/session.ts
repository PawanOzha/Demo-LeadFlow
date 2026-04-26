import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { isDbConnectionError } from "@/lib/db/errors";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { logSessionOrDataError } from "@/lib/server/log";

/** No cookie / not signed in — Supabase returns this; not a server failure. */
function isMissingSessionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("name" in err && err.name === "AuthSessionMissingError") return true;
  const msg =
    "message" in err && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : "";
  return /session missing/i.test(msg);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
  authUserId: string | null;
};

export async function getSession(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      if (!isMissingSessionError(authError)) {
        logSessionOrDataError("getSession.auth", authError);
      }
      return null;
    }
    if (!user?.id) return null;

    const email = (user.email ?? "").trim().toLowerCase();
    let profile = await dbQueryOne<UserRow>(
      `SELECT id, email, name, role, "teamId", "authUserId" FROM "User"
       WHERE "authUserId" = $1 OR ($2 <> '' AND email = $2)
       LIMIT 1`,
      [user.id, email],
    );

    if (!profile) return null;

    if (profile.authUserId !== user.id) {
      await dbQuery(
        `UPDATE "User" SET "authUserId" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
        [user.id, profile.id],
      );
      profile = {
        ...profile,
        authUserId: user.id,
      };
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      teamId: profile.teamId,
    };
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message.includes("Dynamic server usage") ||
        e.message.includes("couldn't be rendered statically"))
    ) {
      throw e;
    }
    if (isDbConnectionError(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[LeadFlow:getSession] Database unreachable — treating as signed out. Check DATABASE_URL and network (e.g. port 5432 blocked).",
        );
      }
      return null;
    }
    logSessionOrDataError("getSession", e);
    return null;
  }
}

export async function destroySession() {
  if (!isSupabaseConfigured()) {
    return;
  }
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (e) {
    logSessionOrDataError("destroySession", e);
  }
}
