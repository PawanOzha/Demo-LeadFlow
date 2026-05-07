export type PortalNavItem = { href: string; label: string };

function navMatches(pathname: string, item: PortalNavItem): boolean {
  if (pathname === item.href) return true;
  if (!item.href || item.href === "/") return false;
  return pathname.startsWith(`${item.href}/`);
}

/** Single active sidebar href for a pathname (longest matching nav item). */
export function activeNavHrefFromPath(
  pathname: string,
  navItems: readonly PortalNavItem[],
): string | null {
  const matches = navItems.filter((item) => navMatches(pathname, item));
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.href.length - a.href.length);
  return matches[0].href;
}

/** Longest nav prefix match so nested routes get the most specific label (e.g. Import vs Leads). */
export function pageTitleFromNav(
  pathname: string,
  navItems: readonly PortalNavItem[],
): string {
  const matches = navItems.filter((item) => navMatches(pathname, item));
  if (matches.length === 0) {
    const p = pathname.replace(/\/$/, "") || "/";
    /* `/superadmin` renders the same view as the dashboard item but is not a nav href prefix. */
    if (p === "/superadmin") {
      const dashboardItem = navItems.find((i) =>
        i.href.endsWith("/dashboard"),
      );
      if (dashboardItem) return dashboardItem.label;
    }
    return humanizePathFallback(pathname);
  }
  matches.sort((a, b) => b.href.length - a.href.length);
  return matches[0].label;
}

function humanizePathFallback(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return "Home";
  return last
    .split("-")
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(" ");
}
