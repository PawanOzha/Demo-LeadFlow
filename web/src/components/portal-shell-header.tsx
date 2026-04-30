import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { HeaderUserAvatar } from "@/components/header-user-avatar";
import {
  PortalNotificationBell,
  type AtlNotificationItem,
} from "@/components/atl/atl-notification-bell";

export function PortalShellHeader({
  homeHref,
  session,
  avatarUrl,
  teamName,
  notifications,
  notificationUnreadCount,
  notificationLeadsHref,
  logoRight = false,
}: {
  homeHref: string;
  session: { name: string; email: string };
  avatarUrl: string | null;
  teamName: string | null;
  notifications: AtlNotificationItem[];
  notificationUnreadCount: number;
  notificationLeadsHref: string;
  logoRight?: boolean;
}) {
  const userCluster = (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <PortalNotificationBell
        initialItems={notifications}
        initialUnread={notificationUnreadCount}
        leadsHref={notificationLeadsHref}
      />
      <div className="flex min-w-0 max-w-[min(100vw-10rem,14rem)] flex-col text-right">
        <span className="truncate text-sm font-semibold text-lf-text">
          {session.name}
        </span>
        <span className="truncate text-xs text-lf-muted">
          {teamName?.trim() ? teamName.trim() : "—"}
        </span>
      </div>
      <HeaderUserAvatar name={session.name} avatarUrl={avatarUrl} />
    </div>
  );

  const brandLink = (
    <Link
      href={homeHref}
      prefetch={true}
      className="flex min-w-0 items-center gap-2 text-sm font-semibold text-lf-text"
    >
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className="truncate">LeadFlow</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-lf-border bg-lf-header/95 px-6 py-3.5 shadow-sm shadow-black/[0.06] backdrop-blur-sm sm:px-6">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
        {logoRight ? (
          <>
            {userCluster}
            {brandLink}
          </>
        ) : (
          <>
            {brandLink}
            {userCluster}
          </>
        )}
      </div>
    </header>
  );
}
