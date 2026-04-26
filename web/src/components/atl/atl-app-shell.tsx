import Link from "next/link";
import { PortalShellHeader } from "@/components/portal-shell-header";
import { appMainContentClass, navFocusRing } from "@/lib/app-shell-ui";
import type { AtlNotificationItem } from "@/components/atl/atl-notification-bell";

const NAV = [
  { href: "/analyst-team-lead", label: "Dashboard" },
  { href: "/analyst-team-lead/leads", label: "Leads" },
  { href: "/analyst-team-lead/reports", label: "Report" },
  { href: "/analyst-team-lead/team", label: "Team" },
  { href: "/analyst-team-lead/settings", label: "Settings" },
] as const;

export function AtlAppShell({
  session,
  avatarUrl,
  teamName,
  notifications,
  notificationUnreadCount,
  children,
}: {
  session: { name: string; email: string };
  avatarUrl: string | null;
  teamName: string | null;
  notifications: AtlNotificationItem[];
  notificationUnreadCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-lf-bg text-lf-text">
      <PortalShellHeader
        homeHref="/analyst-team-lead"
        session={session}
        avatarUrl={avatarUrl}
        teamName={teamName}
        notifications={notifications}
        notificationUnreadCount={notificationUnreadCount}
        notificationLeadsHref="/analyst-team-lead/leads"
      />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 border-r border-lf-border bg-lf-header py-6 pl-4 pr-2 md:block">
          <nav className="space-y-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`block rounded-lg px-3 py-2 text-lf-muted hover:bg-lf-bg/50 hover:text-lf-text ${navFocusRing()}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className={appMainContentClass}>{children}</main>
      </div>
    </div>
  );
}
