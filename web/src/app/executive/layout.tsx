import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ExecAppShell } from "@/components/exec/exec-app-shell";
import { UserRole } from "@/lib/constants";
import { redirectIfMustResetPassword } from "@/lib/auth-redirects";
import { getPortalNotificationsForUser } from "@/lib/portal-notifications";
import { dbQueryOne } from "@/lib/db/pool";
import { timedServerBlock } from "@/lib/server/log";

const inter = Inter({ subsets: ["latin"], display: "swap" });

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

  const [user, notif] = await timedServerBlock("route:/executive layout:data", () =>
    Promise.all([
      dbQueryOne<{ image: string | null; teamName: string | null }>(
        `SELECT u.image, t.name AS "teamName"
         FROM "User" u
         LEFT JOIN "Team" t ON t.id = u."teamId"
         WHERE u.id = $1`,
        [session.id],
      ),
      getPortalNotificationsForUser(session.id),
    ]),
  );

  const teamName = user?.teamName?.trim() || "Sales team";

  return (
    <div className={`${inter.className} h-full min-h-0`}>
      <ExecAppShell
        session={{ name: session.name, email: session.email }}
        avatarUrl={user?.image ?? null}
        teamName={teamName}
        notifications={notif.notifications}
        notificationUnreadCount={notif.unreadCount}
      >
        {children}
      </ExecAppShell>
    </div>
  );
}
