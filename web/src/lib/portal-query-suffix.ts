"use client";

import { useSearchParams } from "next/navigation";

/** `?from=&to=&q=` for portal nav links — preserves date range and client search. */
export function usePortalQuerySuffix(): string {
  const sp = useSearchParams();
  const from = sp.get("from");
  const to = sp.get("to");
  const q = sp.get("q");
  const p = new URLSearchParams();
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  if (q?.trim()) p.set("q", q.trim().slice(0, 200));
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
