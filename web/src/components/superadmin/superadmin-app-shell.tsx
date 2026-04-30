"use client";

import { PortalAppShellLayout } from "@/components/portal-app-shell-layout";
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
  return (
    <PortalAppShellLayout
      homeHref="/superadmin/dashboard"
      navItems={NAV}
      session={session}
      avatarUrl={avatarUrl}
      teamName={teamName}
      notifications={notifications}
      notificationUnreadCount={notificationUnreadCount}
      notificationLeadsHref="/superadmin/leads"
    >
      {children}
    </PortalAppShellLayout>
  );
}
