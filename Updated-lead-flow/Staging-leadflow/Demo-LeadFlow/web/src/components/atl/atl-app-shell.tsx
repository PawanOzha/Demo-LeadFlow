"use client";

import { PortalAppShellLayout } from "@/components/portal-app-shell-layout";
import type { AtlNotificationItem } from "@/components/atl/atl-notification-bell";

const NAV = [
  { href: "/analyst-team-lead", label: "Dashboard" },
  { href: "/analyst-team-lead/leads", label: "Leads" },
  { href: "/analyst-team-lead/qualified-pipeline", label: "Qualified Pipeline" },
  { href: "/analyst-team-lead/team", label: "Team" },
  { href: "/analyst-team-lead/settings", label: "Settings" },
] as const;

export function AtlAppShell({
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
      homeHref="/analyst-team-lead"
      navItems={NAV}
      session={session}
      userId={userId}
      avatarImage={avatarImage}
      teamName={teamName}
      notifications={notifications}
      notificationUnreadCount={notificationUnreadCount}
      notificationLeadsHref="/analyst-team-lead/leads"
      initialSidebarCollapsed={initialSidebarCollapsed}
    >
      {children}
    </PortalAppShellLayout>
  );
}
