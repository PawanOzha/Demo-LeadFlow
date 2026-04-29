"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortalShellHeader } from "@/components/portal-shell-header";
import { AnalystAddLeadProvider } from "@/components/analyst/add-lead-modal";
import { appMainContentClass, navFocusRing } from "@/lib/app-shell-ui";
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
    <AnalystAddLeadProvider>
      <div className="flex min-h-screen flex-col bg-lf-bg text-lf-text">
        <PortalShellHeader
          homeHref="/analyst"
          session={session}
          avatarUrl={avatarUrl}
          teamName={teamName}
          notifications={notifications}
          notificationUnreadCount={notificationUnreadCount}
          notificationLeadsHref="/analyst/leads"
        />
        <div className="flex min-h-0 flex-1">
          <aside className="hidden h-screen w-64 shrink-0 border-r border-gray-200 bg-white px-3 py-4 md:block">
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
    </AnalystAddLeadProvider>
  );
}
