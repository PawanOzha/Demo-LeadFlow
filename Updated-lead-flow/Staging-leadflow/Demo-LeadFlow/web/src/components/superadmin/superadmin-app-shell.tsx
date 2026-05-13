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
  userId,
  avatarImage,
  teamName,
  notifications,
  notificationUnreadCount,
  initialSidebarCollapsed = false,
  children,
}: {
  session: { name: string; email: string };
  userId: string;
  avatarImage: string | null;
  teamName: string | null;
  notifications: AtlNotificationItem[];
  notificationUnreadCount: number;
  initialSidebarCollapsed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PortalAppShellLayout
      homeHref="/superadmin/dashboard"
      navItems={NAV}
      session={session}
      userId={userId}
      avatarImage={avatarImage}
      teamName={teamName}
      notifications={notifications}
      notificationUnreadCount={notificationUnreadCount}
      notificationLeadsHref="/superadmin/leads"
      initialSidebarCollapsed={initialSidebarCollapsed}
    >
      {children}
    </PortalAppShellLayout>
  );
}
