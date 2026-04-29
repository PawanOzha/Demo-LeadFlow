import { dbQuery } from "@/lib/db/pool";
import type { AtlNotificationItem } from "@/components/atl/atl-notification-bell";

export async function getPortalNotificationsForUser(userId: string): Promise<{
  notifications: AtlNotificationItem[];
  unreadCount: number;
}> {
  const notificationRows = await dbQuery<{
    id: string;
    title: string;
    body: string | null;
    read: boolean;
    leadId: string | null;
    createdAt: Date;
    unreadCount: string;
  }>(
    `SELECT
       id,
       title,
       body,
       "read",
       "leadId",
       "createdAt",
       COUNT(*) FILTER (WHERE "read" = false) OVER ()::text AS "unreadCount"
     FROM "Notification"
     WHERE "recipientId" = $1
     ORDER BY "createdAt" DESC
     LIMIT 40`,
    [userId],
  );

  const unreadCount = Number(notificationRows[0]?.unreadCount ?? 0);

  const notifications: AtlNotificationItem[] = notificationRows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    read: n.read,
    leadId: n.leadId,
    createdAt: n.createdAt.toISOString(),
  }));

  return { notifications, unreadCount };
}
