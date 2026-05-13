import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import {
  authAdminCreateUser,
  authAdminUpdatePassword,
} from "@/lib/auth/supabase-admin";
import { UserRole } from "@/lib/constants";

function isAuthUserNotFound(err: unknown): boolean {
  return (
    err instanceof Error && /user not found|not found/i.test(err.message)
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
    console.error("[syncUserPasswordWithAuth:findAuthUserIdByEmail]", e);
    return null;
  }
}

/**
 * Updates Supabase Auth and the portal User row (clears legacy password hash,
 * links authUserId). Caller must enforce authorization for the target user id.
 */
export async function syncUserPasswordWithAuth(params: {
  userId: string;
  password: string;
}): Promise<{ ok: true; password: string } | { error: string }> {
  const { userId, password } = params;

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
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
    return { error: "Cannot change password for this account." };
  }

  let authUserId = user.authUserId;

  if (authUserId) {
    try {
      await authAdminUpdatePassword(authUserId, password);
    } catch (e) {
      if (!isAuthUserNotFound(e)) {
        console.error("[syncUserPasswordWithAuth:updateExistingAuth]", e);
        return { error: "Something went wrong. Please try again." };
      }
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
        console.error("[syncUserPasswordWithAuth:updateDiscoveredAuth]", e);
        return { error: "Could not update password in Supabase Auth." };
      }
    } else {
      try {
        authUserId = await authAdminCreateUser(user.email, password);
      } catch (e) {
        console.error("[syncUserPasswordWithAuth:createAuthUser]", e);
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
    [null, authUserId, userId],
  );

  return { ok: true, password };
}
