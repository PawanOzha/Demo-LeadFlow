"use server";

import { revalidatePath } from "next/cache";
import { dbQuery, dbQueryOne, newId, withTransaction } from "@/lib/db/pool";
import { getSession } from "@/lib/auth/session";
import {
  authAdminCreateUser,
  authAdminDeleteUser,
  authAdminUpdatePassword,
} from "@/lib/auth/supabase-admin";
import { UserRole } from "@/lib/constants";

const PROTECTED_SUPERADMIN_EMAIL = "superadmin@demo.local";

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== UserRole.SUPERADMIN) return null;
  return session;
}

export async function superadminCreateUser(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return { error: "Unauthorized." };

  const role = String(formData.get("role") ?? "").trim();
  if (
    role !== UserRole.LEAD_ANALYST &&
    role !== UserRole.ANALYST_TEAM_LEAD
  ) {
    return { error: "Only Lead Analyst or Analyst Team Lead can be created here." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const exists = await dbQueryOne<{ id: string }>(
    `SELECT id FROM "User" WHERE email = $1`,
    [email],
  );
  if (exists) return { error: "That email is already in use." };

  let authUserId: string;
  try {
    authUserId = await authAdminCreateUser(email, password);
  } catch (e) {
    console.error("[superadminCreateUser] auth create:", e);
    return { error: "Something went wrong. Please try again." };
  }

  const uid = newId();
  try {
    if (role === UserRole.LEAD_ANALYST) {
      const managerId = String(formData.get("managerId") ?? "").trim();
      const analystTeamName = String(formData.get("analystTeamName") ?? "").trim();
      if (!managerId) {
        await authAdminDeleteUser(authUserId);
        return { error: "Lead analyst requires an Analyst Team Lead (manager)." };
      }
      if (!analystTeamName) {
        await authAdminDeleteUser(authUserId);
        return { error: "Analyst team name is required for lead analysts." };
      }
      const mgr = await dbQueryOne<{ id: string }>(
        `SELECT id FROM "User" WHERE id = $1 AND role = $2`,
        [managerId, UserRole.ANALYST_TEAM_LEAD],
      );
      if (!mgr) {
        await authAdminDeleteUser(authUserId);
        return { error: "Invalid Analyst Team Lead." };
      }

      await dbQuery(
        `INSERT INTO "User" (id, email, name, role, "authUserId", "passwordHash", "mustResetPassword", "managerId", "analystTeamName", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          uid,
          email,
          name,
          UserRole.LEAD_ANALYST,
          authUserId,
          password,
          managerId,
          analystTeamName,
        ],
      );
    } else {
      const analystTeamName = String(
        formData.get("analystTeamName") ?? "",
      ).trim();
      if (!analystTeamName) {
        await authAdminDeleteUser(authUserId);
        return { error: "Team name is required for Analyst Team Lead." };
      }
      await dbQuery(
        `INSERT INTO "User" (id, email, name, role, "authUserId", "passwordHash", "mustResetPassword", "analystTeamName", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          uid,
          email,
          name,
          UserRole.ANALYST_TEAM_LEAD,
          authUserId,
          password,
          analystTeamName,
        ],
      );
    }
  } catch {
    await authAdminDeleteUser(authUserId).catch(() => {});
    return { error: "Could not save the user profile. Try again." };
  }

  revalidatePath("/superadmin");
  return { ok: true as const, temporaryPassword: password };
}

export async function superadminCreateUserFormAction(
  _prev: { error?: string; temporaryPassword?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; temporaryPassword?: string } | undefined> {
  const r = await superadminCreateUser(formData);
  if (r && "error" in r) return { error: r.error };
  if (r && "ok" in r && r.ok && "temporaryPassword" in r) {
    return { temporaryPassword: r.temporaryPassword };
  }
  return undefined;
}

export async function superadminSetUserPassword(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return { error: "Unauthorized." };

  const userId = String(formData.get("userId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!userId || !password) {
    return { error: "User and password are required." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const user = await dbQueryOne<{
    role: string;
    authUserId: string | null;
    email: string;
  }>(
    `SELECT role, "authUserId", email FROM "User" WHERE id = $1`,
    [userId],
  );
  if (!user || user.role === UserRole.SUPERADMIN) {
    return { error: "Cannot change password for this account." };
  }

  function isAuthUserNotFound(err: unknown): boolean {
    return (
      err instanceof Error &&
      /user not found|not found/i.test(err.message)
    );
  }

  async function findAuthUserIdByEmail(email: string): Promise<string | null> {
    try {
      const row = await dbQueryOne<{ id: string }>(
        `SELECT id::text AS id
         FROM auth.users
         WHERE lower(email) = lower($1)
         ORDER BY created_at DESC
         LIMIT 1`,
        [email],
      );
      return row?.id ?? null;
    } catch (e) {
      console.error("[superadminSetUserPassword:findAuthUserIdByEmail]", e);
      return null;
    }
  }

  let authUserId = user.authUserId;

  if (authUserId) {
    try {
      await authAdminUpdatePassword(authUserId, password);
    } catch (e) {
      if (!isAuthUserNotFound(e)) {
        console.error("[superadminSetUserPassword:updateExistingAuth]", e);
        return { error: "Something went wrong. Please try again." };
      }
      // Stale link from migration / old auth tenant.
      authUserId = null;
    }
  }

  if (!authUserId) {
    const discovered = await findAuthUserIdByEmail(user.email);
    if (discovered) {
      authUserId = discovered;
      try {
        await authAdminUpdatePassword(authUserId, password);
      } catch (e) {
        console.error("[superadminSetUserPassword:updateDiscoveredAuth]", e);
        return { error: "Could not update password in Supabase Auth." };
      }
    } else {
      try {
        authUserId = await authAdminCreateUser(user.email, password);
      } catch (e) {
        console.error("[superadminSetUserPassword:createAuthUser]", e);
        return {
          error:
            "Could not create/link Supabase Auth user for this account. Verify the email is valid and unique in auth.users.",
        };
      }
    }
  }

  await dbQuery(
    `UPDATE "User"
     SET "passwordHash" = $1,
         "mustResetPassword" = false,
         "authUserId" = $2,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [password, authUserId, userId],
  );

  revalidatePath("/superadmin");
  return { ok: true as const, password };
}

export async function superadminSetPasswordFormAction(
  _prev: { error?: string; password?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; password?: string } | undefined> {
  const r = await superadminSetUserPassword(formData);
  if (r && "error" in r) return { error: r.error };
  if (r && "ok" in r && r.ok && "password" in r) return { password: r.password };
  return undefined;
}

export async function superadminDeleteUser(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return { error: "Unauthorized." };

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return { error: "User is required." };
  if (userId === session.id) {
    return { error: "You cannot delete your own account." };
  }

  const user = await dbQueryOne<{
    role: string;
    authUserId: string | null;
    email: string;
  }>(
    `SELECT role, "authUserId", email FROM "User" WHERE id = $1`,
    [userId],
  );
  if (!user || user.role === UserRole.SUPERADMIN) {
    return { error: "Cannot delete this account." };
  }
  if (user.email.trim().toLowerCase() === PROTECTED_SUPERADMIN_EMAIL) {
    return { error: "This protected account cannot be deleted." };
  }

  const authId = user.authUserId;

  try {
    await dbQuery(`DELETE FROM "User" WHERE id = $1`, [userId]);
    if (authId) {
      await authAdminDeleteUser(authId).catch(() => {
        // Profile removed; auth user may remain — clean up in Supabase Dashboard if needed.
      });
    }
  } catch {
    return {
      error:
        "Could not delete user (they may still have dependent records such as team members or leads).",
    };
  }

  revalidatePath("/superadmin");
  return { ok: true as const };
}

export async function superadminDeleteUserFormAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const r = await superadminDeleteUser(formData);
  if (r && "error" in r) return { error: r.error };
  return undefined;
}

export async function superadminDeleteLead(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return { error: "Unauthorized." };

  const leadId = String(formData.get("leadId") ?? "").trim();
  if (!leadId) return { error: "Lead is required." };

  const exists = await dbQueryOne<{ id: string }>(
    `SELECT id FROM "Lead" WHERE id = $1`,
    [leadId],
  );
  if (!exists) return { error: "Lead not found." };

  try {
    await dbQuery(`DELETE FROM "Notification" WHERE "leadId" = $1`, [leadId]);
    await dbQuery(`DELETE FROM "LeadHandoffLog" WHERE "leadId" = $1`, [leadId]);
    await dbQuery(`DELETE FROM "Lead" WHERE id = $1`, [leadId]);
  } catch {
    return {
      error:
        "Could not delete this lead due to dependent records. Please try again or check related data.",
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/leads");
  return { ok: true as const };
}

export async function superadminDeleteLeadFormAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const r = await superadminDeleteLead(formData);
  if (r && "error" in r) return { error: r.error };
  return undefined;
}

export async function superadminDeleteLeadsBulk(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return { error: "Unauthorized." };

  const raw = String(formData.get("leadIdsCsv") ?? "");
  const uniqueIds = [...new Set(raw.split(",").map((v) => v.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { error: "Select at least one lead." };
  }
  if (uniqueIds.length > 500) {
    return { error: "You can delete up to 500 leads at a time." };
  }

  try {
    await withTransaction(async (client) => {
      await client.query(
        `DELETE FROM "Notification" WHERE "leadId" = ANY($1::text[])`,
        [uniqueIds],
      );
      await client.query(
        `DELETE FROM "LeadHandoffLog" WHERE "leadId" = ANY($1::text[])`,
        [uniqueIds],
      );
      await client.query(`DELETE FROM "Lead" WHERE id = ANY($1::text[])`, [
        uniqueIds,
      ]);
    });
  } catch {
    return {
      error:
        "Could not delete selected leads due to dependent records. Please try again.",
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/leads");
  return { ok: true as const, deletedCount: uniqueIds.length };
}

export async function superadminDeleteLeadsBulkFormAction(
  _prev: { error?: string; deletedCount?: number } | undefined,
  formData: FormData,
): Promise<{ error?: string; deletedCount?: number } | undefined> {
  const r = await superadminDeleteLeadsBulk(formData);
  if (r && "error" in r) return { error: r.error };
  if (r && "ok" in r && r.ok) return { deletedCount: r.deletedCount };
  return undefined;
}

export async function superadminDeleteUsersBulk(formData: FormData) {
  const session = await requireSuperAdmin();
  if (!session) return { error: "Unauthorized." };

  const raw = String(formData.get("userIdsCsv") ?? "");
  const uniqueIds = [...new Set(raw.split(",").map((v) => v.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { error: "Select at least one user." };
  }
  if (uniqueIds.length > 200) {
    return { error: "You can delete up to 200 users at a time." };
  }
  if (uniqueIds.includes(session.id)) {
    return { error: "You cannot delete your own account." };
  }

  const users = await dbQuery<{
    id: string;
    role: string;
    authUserId: string | null;
    email: string;
  }>(
    `SELECT id, role, "authUserId", email FROM "User" WHERE id = ANY($1::text[])`,
    [uniqueIds],
  );
  if (users.length !== uniqueIds.length) {
    return { error: "Some selected users were not found. Refresh and try again." };
  }
  if (users.some((u) => u.role === UserRole.SUPERADMIN)) {
    return { error: "Superadmin accounts cannot be deleted in bulk." };
  }
  if (
    users.some(
      (u) => u.email.trim().toLowerCase() === PROTECTED_SUPERADMIN_EMAIL,
    )
  ) {
    return { error: "This protected account cannot be deleted." };
  }

  try {
    await dbQuery(`DELETE FROM "User" WHERE id = ANY($1::text[])`, [uniqueIds]);
    for (const u of users) {
      if (!u.authUserId) continue;
      await authAdminDeleteUser(u.authUserId).catch(() => {
        // Profile removed; auth user may remain and can be cleaned up manually.
      });
    }
  } catch {
    return {
      error:
        "Could not delete selected users (they may still have dependent records such as team members or leads).",
    };
  }

  revalidatePath("/superadmin");
  revalidatePath("/superadmin/add-user");
  return { ok: true as const, deletedCount: uniqueIds.length };
}

export async function superadminDeleteUsersBulkFormAction(
  _prev: { error?: string; deletedCount?: number } | undefined,
  formData: FormData,
): Promise<{ error?: string; deletedCount?: number } | undefined> {
  const r = await superadminDeleteUsersBulk(formData);
  if (r && "error" in r) return { error: r.error };
  if (r && "ok" in r && r.ok) return { deletedCount: r.deletedCount };
  return undefined;
}
