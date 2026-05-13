"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Keeps `?q=` in sync after typing pauses (shareable URL, preserves with date bar).
 * Does not use `useSearchParams()` (requires Suspense). Reads `window.location.search`
 * inside the effect only. Avoid `router.refresh()` fallbacks — they can throw and
 * hit the root error boundary during concurrent updates.
 */
export function useDebouncedLeadSearchUrl(
  query: string,
  delayMs = 400,
  /** When set, update this path’s query string (e.g. dashboard) instead of the current route. */
  pathnameOverride?: string,
  /** When false, skip URL updates (parent owns `q`, e.g. portal dashboard search bar). */
  enabled = true,
) {
  const router = useRouter();
  const pathnameFromRoute = usePathname();
  const pathname = pathnameOverride ?? pathnameFromRoute;

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      const tq = query.trim().slice(0, 200);
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search.slice(1) : "",
      );
      const currentQ = params.get("q") ?? "";
      if (tq === currentQ) return;

      if (tq) params.set("q", tq);
      else params.delete("q");
      // Search changes should always restart pagination from page 1.
      params.set("page", "1");
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      void router.replace(href);
    }, delayMs);
    return () => clearTimeout(t);
  }, [query, delayMs, pathname, router, enabled]);
}
