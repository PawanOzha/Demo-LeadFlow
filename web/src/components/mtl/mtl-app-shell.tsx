"use client";

import { PortalAppShellLayout } from "@/components/portal-app-shell-layout";
import type { AtlNotificationItem } from "@/components/atl/atl-notification-bell";

const NAV = [
  { href: "/team-lead", label: "Dashboard" },
  { href: "/team-lead/leads", label: "Leads" },
  { href: "/team-lead/reports", label: "Team reports" },
  { href: "/team-lead/team", label: "Team" },
  { href: "/team-lead/settings", label: "Settings" },
] as const;

export function MtlAppShell({
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
      homeHref="/team-lead"
      navItems={NAV}
      session={session}
      avatarUrl={avatarUrl}
      teamName={teamName}
      notifications={notifications}
      notificationUnreadCount={notificationUnreadCount}
      notificationLeadsHref="/team-lead/leads"
    >
      {children}
    </PortalAppShellLayout>
  );
}
