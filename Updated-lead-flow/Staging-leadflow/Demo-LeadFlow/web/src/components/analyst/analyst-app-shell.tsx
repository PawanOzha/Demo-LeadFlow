"use client";

import { PortalAppShellLayout } from "@/components/portal-app-shell-layout";
import { AnalystAddLeadProvider } from "@/components/analyst/add-lead-modal";
import type { AtlNotificationItem } from "@/components/atl/atl-notification-bell";

const NAV = [
  { href: "/analyst", label: "Dashboard" },
  { href: "/analyst/pipeline", label: "Pipeline" },
  { href: "/analyst/leads", label: "Leads" },
  { href: "/analyst/leads/import", label: "Import" },
  { href: "/analyst/settings", label: "Settings" },
] as const;

export function AnalystAppShell({
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
    <AnalystAddLeadProvider>
      <PortalAppShellLayout
        homeHref="/analyst"
        navItems={NAV}
        session={session}
        userId={userId}
        avatarImage={avatarImage}
        teamName={teamName}
        notifications={notifications}
        notificationUnreadCount={notificationUnreadCount}
        notificationLeadsHref="/analyst/leads"
        initialSidebarCollapsed={initialSidebarCollapsed}
      >
        {children}
      </PortalAppShellLayout>
    </AnalystAddLeadProvider>
  );
}
