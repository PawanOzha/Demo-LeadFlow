import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { ExecAppShell } from "@/components/exec/exec-app-shell";
import { UserRole } from "@/lib/constants";
import { redirectIfMustResetPassword } from "@/lib/auth-redirects";
import { getPortalNotificationsForUser } from "@/lib/portal-notifications";
import { dbQueryOne } from "@/lib/db/pool";
import { timedServerBlock } from "@/lib/server/log";

/** Dashboard/leads date filters use `searchParams`; avoid caching HTML without query. */
export const dynamic = "force-dynamic";

export default async function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== UserRole.SALES_EXECUTIVE) {
    redirect("/login");
  }
  await redirectIfMustResetPassword();

  const { user, notif } = await timedServerBlock(
    "route:/executive layout:data",
    async () => {
      const userRow = await dbQueryOne<{ image: string | null; teamName: string | null }>(
        `SELECT u.image, t.name AS "teamName"
         FROM "User" u
         LEFT JOIN "Team" t ON t.id = u."teamId"
         WHERE u.id = $1`,
        [session.id],
      );
      const notif = await getPortalNotificationsForUser(session.id);
      return { user: userRow, notif };
    },
  );

  const teamName = user?.teamName?.trim() || "Sales team";
  const cookieStore = await cookies();
  const initialSidebarCollapsed =
    cookieStore.get("lf_sidebar_collapsed")?.value === "1";

  return (
    <ExecAppShell
      session={{ name: session.name, email: session.email }}
      userId={session.id}
      avatarImage={user?.image ?? null}
      teamName={teamName}
      notifications={notif.notifications}
      notificationUnreadCount={notif.unreadCount}
      initialSidebarCollapsed={initialSidebarCollapsed}
    >
      {children}
    </ExecAppShell>
  );
}
