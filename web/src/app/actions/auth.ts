"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { isDbConnectionError, isDbPasswordAuthError } from "@/lib/db/errors";
import { getSession } from "@/lib/auth/session";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { homePathForRole } from "@/lib/role-home";

const loginRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type UserRow = {
  id: string;
  email: string;
  authUserId: string | null;
  role: string;
  mustResetPassword: boolean;
};

export async function loginAction(formData: FormData) {
  const rawEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawPassword = String(formData.get("password") ?? "");
  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });
  if (!parsed.success) {
    return { error: "Invalid input. Please check your fields." };
  }
  const email = parsed.data.email;
  const password = parsed.data.password;

  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  try {
    await loginRateLimiter.consume(ip);
  } catch {
    return {
      error:
        "Too many login attempts. Please wait 60 seconds and try again.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Invalid email or password." };
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const authUserId = authUser?.id;

  let user: UserRow | null;
  try {
    user = await dbQueryOne<UserRow>(
      `SELECT id, email, "authUserId", role, "mustResetPassword" FROM "User"
       WHERE email = $1 OR ($2::text IS NOT NULL AND "authUserId" = $2)
       LIMIT 1`,
      [email, authUserId ?? null],
    );
    if (user && authUserId && user.authUserId !== authUserId) {
      await dbQuery(
        `UPDATE "User" SET "authUserId" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
        [authUserId, user.id],
      );
      user = { ...user, authUserId };
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("DATABASE_URL still")) {
      await supabase.auth.signOut();
      return { error: e.message };
    }
    if (isDbPasswordAuthError(e)) {
      await supabase.auth.signOut();
      return {
        error:
          "Database rejected DATABASE_URL: wrong database password (this is the Postgres password in your connection string, not your Supabase login). In Supabase → Project Settings → Database, reset the database password or use “Copy connection string”, then update web/.env. URL-encode @ # % and other special characters in the password.",
      };
    }
    if (isDbConnectionError(e)) {
      await supabase.auth.signOut();
      return {
        error:
          "Cannot connect to the database. Check DATABASE_URL in web/.env, resume the Supabase project if paused, try another network (port 5432 is often blocked), or use the Session pooler URI (port 6543) from Supabase.",
      };
    }
    throw e;
  }

  if (!user) {
    await supabase.auth.signOut();
    return {
      error:
        "No LeadFlow user for this account (Supabase sign-in worked, but the app database has no matching profile). On Railway, redeploy so startup can create superadmin on an empty DB, or run `npm run db:seed:bootstrap` from the web folder with this deployment’s DATABASE_URL and Supabase keys.",
    };
  }

  if (user.mustResetPassword) {
    redirect("/reset-password");
  }

  redirect(homePathForRole(user.role) ?? "/login");
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function completeMandatoryPasswordResetAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const user = await dbQueryOne<{
    mustResetPassword: boolean;
    authUserId: string | null;
    role: string;
  }>(
    `SELECT "mustResetPassword", "authUserId", role FROM "User" WHERE id = $1`,
    [session.id],
  );
  if (!user?.mustResetPassword) {
    return { error: "Password reset is not required for this account." };
  }
  if (!user.authUserId) {
    return {
      error:
        "This account is not linked to Supabase Auth. Contact an administrator.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[completeMandatoryPasswordResetAction]", error);
    return { error: "Something went wrong. Please try again." };
  }

  await dbQuery(
    `UPDATE "User"
     SET "passwordHash" = $1, "mustResetPassword" = false, "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [password, session.id],
  );

  revalidatePath("/", "layout");
  return {
    ok: true as const,
    redirectTo: homePathForRole(user.role) ?? "/login",
  };
}
