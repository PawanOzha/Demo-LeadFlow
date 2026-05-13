"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";

const LAYOUT_ROOTS = [
  "/analyst",
  "/analyst-team-lead",
  "/team-lead",
  "/executive",
  "/superadmin",
] as const;

function revalidatePortalLayouts() {
  for (const p of LAYOUT_ROOTS) {
    revalidatePath(p, "layout");
  }
}

export async function markNotificationRead(notificationId: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };

  const n = await dbQueryOne<{ id: string }>(
    `SELECT id FROM "Notification" WHERE id = $1 AND "recipientId" = $2`,
    [notificationId, session.id],
  );
  if (!n) return { error: "Not found." };

  await dbQuery(
    `UPDATE "Notification" SET "read" = true WHERE id = $1`,
    [notificationId],
  );

  revalidatePortalLayouts();
  return { ok: true as const };
}

export async function markAllNotificationsRead() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };

  await dbQuery(
    `UPDATE "Notification" SET "read" = true WHERE "recipientId" = $1 AND "read" = false`,
    [session.id],
  );

  revalidatePortalLayouts();
  return { ok: true as const };
}
