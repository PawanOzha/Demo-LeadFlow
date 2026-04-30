"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/logo";
import {
  PortalShellHeader,
  PortalShellUserCluster,
} from "@/components/portal-shell-header";
import { navFocusRing, appMainContentClass } from "@/lib/app-shell-ui";
import {
  activeNavHrefFromPath,
  pageTitleFromNav,
  type PortalNavItem,
} from "@/lib/portal-page-title";
import { PortalNavIcon } from "@/components/portal-nav-icon";
import type { AtlNotificationItem } from "@/components/atl/atl-notification-bell";

export type { PortalNavItem };

export type PortalAppShellLayoutProps = {
  homeHref: string;
  navItems: readonly PortalNavItem[];
  session: { name: string; email: string };
  avatarUrl: string | null;
  teamName: string | null;
  notifications: AtlNotificationItem[];
  notificationUnreadCount: number;
  notificationLeadsHref: string;
  logoRight?: boolean;
  children: React.ReactNode;
};

function navLinkClass(active: boolean) {
  return `flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition-all duration-150 ${
    active
      ? "bg-lf-sidebar-active font-semibold text-lf-cyan"
      : "text-lf-muted hover:bg-lf-row-hover hover:text-lf-text"
  } ${navFocusRing()}`;
}

export function PortalAppShellLayout({
  homeHref,
  navItems,
  session,
  avatarUrl,
  teamName,
  notifications,
  notificationUnreadCount,
  notificationLeadsHref,
  logoRight = false,
  children,
}: PortalAppShellLayoutProps) {
  const pathname = usePathname();
  const pageTitle = pageTitleFromNav(pathname, navItems);
  const activeHref = activeNavHrefFromPath(pathname, navItems);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const brandRow = (
    <Link
      href={homeHref}
      prefetch={true}
      className="flex min-w-0 items-center gap-2.5 text-sm font-semibold leading-none text-lf-text"
      onClick={() => setMobileNavOpen(false)}
    >
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="truncate leading-tight">LeadFlow</span>
    </Link>
  );

  const navList = (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={true}
          className={navLinkClass(activeHref === item.href)}
          onClick={() => setMobileNavOpen(false)}
        >
          <PortalNavIcon href={item.href} />
          <span className="min-w-0 truncate">{item.label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="flex h-dvh min-h-0 max-h-dvh flex-col overflow-hidden bg-lf-bg text-lf-text md:flex-row">
      {/* Desktop: full-height sidebar — logo + scrollable nav */}
      <aside className="hidden min-h-0 w-[240px] shrink-0 flex-col border-r border-lf-border bg-lf-surface md:flex">
        <div className="flex h-14 min-h-14 shrink-0 items-center border-b border-lf-border px-3">
          {brandRow}
        </div>
        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3"
          aria-label="Main navigation"
        >
          {navList}
        </nav>
      </aside>

      {/* Main column: mobile top bar, desktop toolbar, scrollable content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile: menu + inline brand + user tools */}
        <div className="flex h-14 min-h-14 shrink-0 items-center gap-2 border-b border-lf-border bg-lf-header/95 px-3 backdrop-blur-sm md:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-lf-border bg-lf-surface text-lf-text hover:bg-lf-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35"
            onClick={() => setMobileNavOpen(true)}
            aria-expanded={mobileNavOpen}
            aria-controls="portal-mobile-nav"
            aria-label="Open navigation menu"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold leading-tight text-lf-text">
            {pageTitle}
          </h1>
          <PortalShellUserCluster
            session={session}
            avatarUrl={avatarUrl}
            teamName={teamName}
            notifications={notifications}
            notificationUnreadCount={notificationUnreadCount}
            notificationLeadsHref={notificationLeadsHref}
            compact
          />
        </div>

        {/* Desktop: full-width toolbar to the right of the sidebar (no duplicate logo) */}
        <div className="hidden min-w-0 shrink-0 md:block">
          <PortalShellHeader
            homeHref={homeHref}
            session={session}
            avatarUrl={avatarUrl}
            teamName={teamName}
            notifications={notifications}
            notificationUnreadCount={notificationUnreadCount}
            notificationLeadsHref={notificationLeadsHref}
            logoRight={logoRight}
            showBrand={false}
            pageTitle={pageTitle}
          />
        </div>

        {/* Mobile drawer */}
        {mobileNavOpen ? (
          <div
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-mobile-nav-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              tabIndex={-1}
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <div
              id="portal-mobile-nav"
              className="absolute left-0 top-0 flex h-full w-[min(280px,88vw)] flex-col border-r border-lf-border bg-lf-surface shadow-xl"
            >
              <div className="flex h-14 min-h-14 shrink-0 items-center justify-between gap-2 border-b border-lf-border px-3">
                <span id="portal-mobile-nav-title" className="sr-only">
                  Main navigation
                </span>
                <div className="min-w-0">{brandRow}</div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-2 text-lf-muted hover:bg-lf-row-hover hover:text-lf-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <nav
                className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3"
                aria-label="Main navigation"
              >
                {navList}
              </nav>
            </div>
          </div>
        ) : null}

        <main className={appMainContentClass}>{children}</main>
      </div>
    </div>
  );
}

