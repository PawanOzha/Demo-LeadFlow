"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Keeps `?q=` in sync after typing pauses (shareable URL, preserves with date bar).
 * Does not use `useSearchParams()` (requires Suspense). Reads `window.location.search`
 * inside the effect only. Avoid `router.refresh()` fallbacks — they can throw and
 * hit the root error boundary during concurrent updates.
 */
export function useDebouncedLeadSearchUrl(query: string, delayMs = 400) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const t = setTimeout(() => {
      const tq = query.trim().slice(0, 200);
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search.slice(1) : "",
      );
      const currentQ = params.get("q") ?? "";
      if (tq === currentQ) return;

      if (tq) params.set("q", tq);
      else params.delete("q");
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      void router.replace(href);
    }, delayMs);
    return () => clearTimeout(t);
  }, [query, delayMs, pathname, router]);
}
