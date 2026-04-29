"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/auth/supabase-admin";
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

async function findUserByEmailOrAuth(
  email: string,
  authUserId: string | null,
): Promise<UserRow | null> {
  const admin = createSupabaseAdminClient();
  const clauses = [`email.eq.${email}`];
  if (authUserId) clauses.push(`authUserId.eq.${authUserId}`);
  const { data, error } = await admin
    .from("User")
    .select(`id, email, authUserId, role, mustResetPassword`)
    .or(clauses.join(","))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow | null) ?? null;
}

async function linkUserToAuth(userId: string, authUserId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("User")
    .update({
      authUserId,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}

async function getPasswordResetState(sessionUserId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("User")
    .select(`mustResetPassword, authUserId, role`)
    .eq("id", sessionUserId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as
    | { mustResetPassword: boolean; authUserId: string | null; role: string }
    | null;
}

async function completePasswordReset(sessionUserId: string, password: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("User")
    .update({
      passwordHash: password,
      mustResetPassword: false,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", sessionUserId);
  if (error) throw error;
}

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
    user = await findUserByEmailOrAuth(email, authUserId ?? null);
    if (user && authUserId && user.authUserId !== authUserId) {
      await linkUserToAuth(user.id, authUserId);
      user = { ...user, authUserId };
    }
  } catch (e) {
    await supabase.auth.signOut();
    console.error("[loginAction:userLookup]", e);
    return { error: "Could not load user profile from Supabase." };
  }

  if (!user) {
    await supabase.auth.signOut();
    return {
      error:
        "No LeadFlow user for this account (Supabase sign-in worked, but the app database has no matching profile). Create the app user record in the User table and link it to this auth account.",
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

  const user = await getPasswordResetState(session.id);
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

  await completePasswordReset(session.id, password);

  revalidatePath("/", "layout");
  return {
    ok: true as const,
    redirectTo: homePathForRole(user.role) ?? "/login",
  };
}
