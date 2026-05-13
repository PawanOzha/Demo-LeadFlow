"use client";

import { PortalAppShellLayout } from "@/components/portal-app-shell-layout";
import type { AtlNotificationItem } from "@/components/atl/atl-notification-bell";

const NAV = [
  { href: "/executive", label: "Dashboard" },
  { href: "/executive/leads", label: "My leads" },
  { href: "/executive/settings", label: "Settings" },
] as const;

export function ExecAppShell({
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
      homeHref="/executive"
      navItems={NAV}
      session={session}
      userId={userId}
      avatarImage={avatarImage}
      teamName={teamName}
      notifications={notifications}
      notificationUnreadCount={notificationUnreadCount}
      notificationLeadsHref="/executive/leads"
      initialSidebarCollapsed={initialSidebarCollapsed}
    >
      {children}
    </PortalAppShellLayout>
  );
}
