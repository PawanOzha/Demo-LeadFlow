"use client";

import { PortalAppShellLayout } from "@/components/portal-app-shell-layout";
import { AnalystAddLeadProvider } from "@/components/analyst/add-lead-modal";
import type { AtlNotificationItem } from "@/components/atl/atl-notification-bell";

const NAV = [
  { href: "/analyst", label: "Dashboard" },
  { href: "/analyst/leads", label: "Leads" },
  { href: "/analyst/leads/import", label: "Import" },
  { href: "/analyst/settings", label: "Settings" },
] as const;

export function AnalystAppShell({
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
    <AnalystAddLeadProvider>
      <PortalAppShellLayout
        homeHref="/analyst"
        navItems={NAV}
        session={session}
        avatarUrl={avatarUrl}
        teamName={teamName}
        notifications={notifications}
        notificationUnreadCount={notificationUnreadCount}
        notificationLeadsHref="/analyst/leads"
      >
        {children}
      </PortalAppShellLayout>
    </AnalystAddLeadProvider>
  );
}
