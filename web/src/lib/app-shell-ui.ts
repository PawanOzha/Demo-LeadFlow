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

/** Main scroll region inside the column to the right of the sidebar. */
export const appMainContentClass =
  "min-h-0 w-full min-w-0 flex-1 max-w-none overflow-y-auto [scrollbar-gutter:stable] px-4 py-4 sm:px-7 sm:py-6 lg:px-7 lg:py-6";

/**
 * Default wrapper for portal route pages — fills the main column (no artificial max-width centering).
 * Prefer this over `mx-auto max-w-6xl` / `max-w-7xl` for dashboards and wide tables.
 */
export const portalPageInnerClass = "w-full min-w-0";

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
