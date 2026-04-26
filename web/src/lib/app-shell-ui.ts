/** Shared layout / a11y classes for all role app shells (same theme everywhere). */

/** No overflow-x-hidden — it blocks touch/scroll on wide tables inside main. */
export const appMainContentClass =
  "w-full min-w-0 flex-1 max-w-none px-4 py-6 sm:px-6 sm:py-8 lg:px-10";

/** Wide lead tables: reliable horizontal scroll (incl. iOS) + touch pan. */
export const portalDataTableScrollClass =
  "w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] touch-pan-x scroll-smooth";

/** Keyboard focus ring — brand blue (distinct from red primary CTAs). */
export function navFocusRing() {
  return "outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/45 focus-visible:ring-offset-2 focus-visible:ring-offset-lf-header";
}

/** Standard card surface (dashboards, settings). */
export const portalCardClass =
  "rounded-2xl border border-lf-border bg-lf-surface p-6 shadow-sm shadow-[#0066ff]/8";
