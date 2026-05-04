"use client";

import { useEffect, useRef } from "react";

/** Scrolls the table region into view when the server-driven page index changes. */
export function usePortalLeadTablePageScroll(page: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);
  return ref;
}
