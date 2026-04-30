import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { HeaderUserAvatar } from "@/components/header-user-avatar";
import {
  PortalNotificationBell,
  type AtlNotificationItem,
} from "@/components/atl/atl-notification-bell";

export type PortalShellUserClusterProps = {
  session: { name: string; email: string };
  avatarUrl: string | null;
  teamName: string | null;
  notifications: AtlNotificationItem[];
  notificationUnreadCount: number;
  notificationLeadsHref: string;
  /** Hide name/team text on the narrowest viewports (more room for actions). */
  compact?: boolean;
};

export function PortalShellUserCluster({
  session,
  avatarUrl,
  teamName,
  notifications,
  notificationUnreadCount,
  notificationLeadsHref,
  compact = false,
}: PortalShellUserClusterProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <PortalNotificationBell
        initialItems={notifications}
        initialUnread={notificationUnreadCount}
        leadsHref={notificationLeadsHref}
      />
      <div
        className={`min-w-0 max-w-[min(100vw-10rem,14rem)] flex-col text-right ${
          compact ? "hidden sm:flex" : "flex"
        }`}
      >
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
}

export function PortalShellHeader({
  homeHref,
  session,
  avatarUrl,
  teamName,
  notifications,
  notificationUnreadCount,
  notificationLeadsHref,
  logoRight = false,
  showBrand = true,
}: PortalShellUserClusterProps & {
  homeHref: string;
  logoRight?: boolean;
  /** When false (e.g. brand lives in sidebar), toolbar shows user controls only, full width of the main column. */
  showBrand?: boolean;
}) {
  const userCluster = (
    <PortalShellUserCluster
      session={session}
      avatarUrl={avatarUrl}
      teamName={teamName}
      notifications={notifications}
      notificationUnreadCount={notificationUnreadCount}
      notificationLeadsHref={notificationLeadsHref}
    />
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

  if (!showBrand) {
    return (
      <header className="sticky top-0 z-20 flex h-14 min-h-14 w-full shrink-0 items-center border-b border-lf-border bg-lf-header/95 px-4 shadow-sm shadow-black/[0.06] backdrop-blur-sm sm:px-6">
        <div className="flex w-full items-center justify-end">{userCluster}</div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 w-full shrink-0 border-b border-lf-border bg-lf-header/95 shadow-sm shadow-black/[0.06] backdrop-blur-sm">
      <div className="mx-auto flex h-14 min-h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
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
