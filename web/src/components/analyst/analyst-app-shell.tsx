import Link from "next/link";
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
          <aside className="hidden w-52 shrink-0 border-r border-lf-border bg-lf-header py-6 pl-4 pr-2 md:block">
            <nav className="space-y-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`block rounded-lg px-3 py-2 text-lf-muted hover:bg-lf-bg/50 hover:text-lf-text ${navFocusRing()}`}
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
