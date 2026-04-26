import { redirect } from "next/navigation";
import { dbQueryOne } from "@/lib/db/pool";
import { getSession } from "@/lib/auth/session";

/** Send users who must complete a mandatory password reset to `/reset-password`. */
export async function redirectIfMustResetPassword() {
  const session = await getSession();
  if (!session) return;
  const u = await dbQueryOne<{ mustResetPassword: boolean }>(
    `SELECT "mustResetPassword" FROM "User" WHERE id = $1`,
    [session.id],
  );
  if (u?.mustResetPassword) {
    redirect("/reset-password");
  }
}
