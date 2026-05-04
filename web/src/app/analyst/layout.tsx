import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AnalystAppShell } from "@/components/analyst/analyst-app-shell";
import { UserRole } from "@/lib/constants";
import { redirectIfMustResetPassword } from "@/lib/auth-redirects";
import { getPortalNotificationsForUser } from "@/lib/portal-notifications";
import { dbQueryOne } from "@/lib/db/pool";
import { timedServerBlock } from "@/lib/server/log";

const inter = Inter({ subsets: ["latin"], display: "swap" });

/** Dashboard/leads date filters use `searchParams`; avoid stale cached pages. */
export const dynamic = "force-dynamic";

export default async function AnalystLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== UserRole.LEAD_ANALYST) {
    redirect("/login");
  }
  await redirectIfMustResetPassword();

  const [user, notif] = await timedServerBlock("route:/analyst layout:data", () =>
    Promise.all([
      dbQueryOne<{ image: string | null; analystTeamName: string | null }>(
        `SELECT image, "analystTeamName" FROM "User" WHERE id = $1`,
        [session.id],
      ),
      getPortalNotificationsForUser(session.id),
    ]),
  );

  const teamName =
    user?.analystTeamName?.trim() || "Lead Analyst";

  return (
    <div className={`${inter.className} h-full min-h-0`}>
      <AnalystAppShell
        session={{ name: session.name, email: session.email }}
        avatarUrl={user?.image ?? null}
        teamName={teamName}
        notifications={notif.notifications}
        notificationUnreadCount={notif.unreadCount}
      >
        {children}
      </AnalystAppShell>
    </div>
  );
}
