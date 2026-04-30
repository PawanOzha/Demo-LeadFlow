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
  { href: "/executive", label: "Dashboard" },
  { href: "/executive/leads", label: "My leads" },
  { href: "/executive/settings", label: "Settings" },
] as const;

export function ExecAppShell({
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
        homeHref="/executive"
        session={session}
        avatarUrl={avatarUrl}
        teamName={teamName}
        notifications={notifications}
        notificationUnreadCount={notificationUnreadCount}
        notificationLeadsHref="/executive/leads"
      />
      <div className={portalAppShellContentRowClass}>
        <aside className={portalAppShellSidebarClass}>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
