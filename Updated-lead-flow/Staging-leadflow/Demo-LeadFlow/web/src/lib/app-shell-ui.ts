/** Shared layout / a11y classes for role app shells (see `PortalAppShellLayout`). */

/** Root shell: viewport height; column on mobile, row on md+ (sidebar | main). */
export const portalAppShellRootClass =
  "flex h-dvh min-h-0 max-h-dvh flex-col overflow-hidden bg-lf-bg text-lf-text md:flex-row";

/** Legacy: previously header + content row. Prefer `PortalAppShellLayout` structure. */
export const portalAppShellContentRowClass =
  "flex min-h-0 flex-1 overflow-hidden";

/** Legacy sidebar classes — sidebar markup lives in `PortalAppShellLayout`. */
export const portalAppShellSidebarClass =
  "hidden min-h-0 w-[240px] shrink-0 flex-col border-r border-lf-border bg-lf-surface md:flex";

/** Main scroll region (below fixed top bar; see `PortalAppShellLayout`). */
export const appMainContentClass =
  "min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pb-5 pt-20 md:px-4 md:pb-6 md:pt-20 lg:px-6 lg:pb-8 lg:pt-20";

/** Wide lead tables: reliable horizontal scroll (incl. iOS). `overflow-x-hidden` on main keeps x-scroll on this layer. */
export const portalDataTableScrollClass =
  "w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] scroll-smooth pb-1";

/** Keyboard focus ring — accent blue halo (~accent 22%). */
export function navFocusRing() {
  return "outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/20 focus-visible:ring-offset-2 focus-visible:ring-offset-lf-header";
}

/** Standard card surface (dashboards, settings). */
export const portalCardClass =
  "rounded-xl border border-lf-border/80 bg-lf-surface p-6 shadow-[var(--shadow-lf-sm)]";
