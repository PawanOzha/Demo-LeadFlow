/** Shared layout / a11y classes for all role app shells (same theme everywhere). */

/** Fills the viewport; scroll is confined to main so the sidebar does not move. */
export const portalAppShellRootClass =
  "flex h-dvh min-h-0 max-h-dvh flex-col overflow-hidden bg-lf-bg text-lf-text";

/** Row under the header: takes remaining height; children clip so only main scrolls. */
export const portalAppShellContentRowClass =
  "flex min-h-0 flex-1 overflow-hidden";

/**
 * Sidebar: full height of the content row, independent of main scroll.
 * `overflow-y-auto` if nav items exceed viewport (rare).
 */
export const portalAppShellSidebarClass =
  "hidden w-[240px] shrink-0 self-stretch overflow-y-auto border-r border-lf-border bg-lf-surface px-3 py-4 md:block";

/** No overflow-x-hidden — it blocks touch/scroll on wide tables inside main. */
export const appMainContentClass =
  "min-h-0 w-full min-w-0 flex-1 max-w-none overflow-y-auto px-6 py-6 sm:px-7 sm:py-6 lg:px-7 lg:py-6";

/** Wide lead tables: reliable horizontal scroll (incl. iOS) + touch pan. */
export const portalDataTableScrollClass =
  "w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] touch-pan-x scroll-smooth";

/** Keyboard focus ring — accent blue halo (~accent 22%). */
export function navFocusRing() {
  return "outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-lf-header";
}

/** Standard card surface (dashboards, settings). */
export const portalCardClass =
  "rounded-[14px] border border-lf-border bg-lf-surface p-6 shadow-[0_8px_20px_var(--color-lf-card-shadow)]";
