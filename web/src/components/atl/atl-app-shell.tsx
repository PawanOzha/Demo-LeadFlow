"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortalShellHeader } from "@/components/portal-shell-header";
import {
  appMainContentClass,
  navFocusRing,
  portalAppShellContentRowClass,
  portalAppShellRootClass,
  portalAppShellSidebarClass,
} from "@/lib/app-shell-ui";
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
  const pathname = usePathname();

  return (
    <div className={portalAppShellRootClass}>
      <PortalShellHeader
        homeHref="/analyst-team-lead"
        session={session}
        avatarUrl={avatarUrl}
        teamName={teamName}
        notifications={notifications}
        notificationUnreadCount={notificationUnreadCount}
        notificationLeadsHref="/analyst-team-lead/leads"
      />
      <div className={portalAppShellContentRowClass}>
        <aside className={portalAppShellSidebarClass}>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition-all duration-150 ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-lf-sidebar-active font-semibold text-lf-cyan"
                    : "text-lf-muted hover:bg-lf-row-hover hover:text-lf-text"
                } ${navFocusRing()}`}
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
