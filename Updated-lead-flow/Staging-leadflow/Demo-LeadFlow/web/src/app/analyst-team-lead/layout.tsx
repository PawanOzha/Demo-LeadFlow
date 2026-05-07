import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { AtlAppShell } from "@/components/atl/atl-app-shell";
import { UserRole } from "@/lib/constants";
import { redirectIfMustResetPassword } from "@/lib/auth-redirects";
import { getPortalNotificationsForUser } from "@/lib/portal-notifications";
import { dbQueryOne } from "@/lib/db/pool";
import { timedServerBlock } from "@/lib/server/log";

/** Session + leads search (`?q`) / pagination need per-request rendering. */
export const dynamic = "force-dynamic";

export default async function AnalystTeamLeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== UserRole.ANALYST_TEAM_LEAD) {
    redirect("/login");
  }
  await redirectIfMustResetPassword();

  const [user, notif] = await timedServerBlock(
    "route:/analyst-team-lead layout:data",
    () =>
      Promise.all([
        dbQueryOne<{ image: string | null; analystTeamName: string | null }>(
          `SELECT image, "analystTeamName" FROM "User" WHERE id = $1`,
          [session.id],
        ),
        getPortalNotificationsForUser(session.id),
      ]),
  );

  const teamName =
    user?.analystTeamName?.trim() || "Analyst team lead";
  const cookieStore = await cookies();
  const initialSidebarCollapsed =
    cookieStore.get("lf_sidebar_collapsed")?.value === "1";

  return (
    <AtlAppShell
      session={{ name: session.name, email: session.email }}
      avatarUrl={user?.image ?? null}
      teamName={teamName}
      notifications={notif.notifications}
      notificationUnreadCount={notif.unreadCount}
      initialSidebarCollapsed={initialSidebarCollapsed}
    >
      {children}
    </AtlAppShell>
  );
}
