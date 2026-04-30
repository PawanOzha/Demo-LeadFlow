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
  { href: "/superadmin/dashboard", label: "Dashboard" },
  { href: "/superadmin/add-user", label: "Add user" },
  { href: "/superadmin/leads", label: "Leads" },
  { href: "/superadmin/report", label: "Report" },
  { href: "/superadmin/settings", label: "Settings" },
] as const;

export function SuperadminAppShell({
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
        homeHref="/superadmin/dashboard"
        session={session}
        avatarUrl={avatarUrl}
        teamName={teamName}
        notifications={notifications}
        notificationUnreadCount={notificationUnreadCount}
        notificationLeadsHref="/superadmin/leads"
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
