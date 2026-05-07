import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SuperadminAppShell } from "@/components/superadmin/superadmin-app-shell";

/** Never prerender superadmin routes at build time (avoids DB access when offline). */
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth/session";
import { UserRole } from "@/lib/constants";
import { redirectIfMustResetPassword } from "@/lib/auth-redirects";
import { getPortalNotificationsForUser } from "@/lib/portal-notifications";
import { dbQueryOne } from "@/lib/db/pool";
import { timedServerBlock } from "@/lib/server/log";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== UserRole.SUPERADMIN) {
    redirect("/login");
  }
  await redirectIfMustResetPassword();

  const [user, notif] = await timedServerBlock(
    "route:/superadmin layout:data",
    () =>
      Promise.all([
        dbQueryOne<{ image: string | null }>(
          `SELECT image FROM "User" WHERE id = $1`,
          [session.id],
        ),
        getPortalNotificationsForUser(session.id),
      ]),
  );
  const cookieStore = await cookies();
  const initialSidebarCollapsed =
    cookieStore.get("lf_sidebar_collapsed")?.value === "1";

  return (
    <SuperadminAppShell
      session={{ name: session.name, email: session.email }}
      avatarUrl={user?.image ?? null}
      teamName="Superadmin"
      notifications={notif.notifications}
      notificationUnreadCount={notif.unreadCount}
      initialSidebarCollapsed={initialSidebarCollapsed}
    >
      {children}
    </SuperadminAppShell>
  );
}
