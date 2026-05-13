"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type ReportScrollNavTab = {
  id: string;
  label: string;
  href: string;
};

function hashId(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#/, "");
}

export function ReportScrollSectionNav({
  tabs,
  className = "",
}: {
  tabs: ReportScrollNavTab[];
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string>(() => tabs[0]?.id ?? "");

  useEffect(() => {
    const sync = () => {
      const h = hashId();
      if (h && tabs.some((t) => t.id === h)) {
        setActiveId(h);
        return;
      }
      if (!h && tabs[0]) {
        setActiveId(tabs[0].id);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [tabs]);

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Jump to report section"
      className={`sticky top-2 z-20 w-full max-w-full overflow-x-auto rounded-2xl border border-lf-border/90 bg-lf-surface/95 p-1.5 shadow-sm shadow-black/10 backdrop-blur-md supports-[backdrop-filter]:bg-lf-surface/85 ${className}`}
    >
      <ul className="flex min-w-max items-center gap-1 px-0.5">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href}
              scroll
              className={`inline-flex items-center rounded-xl px-3.5 py-2 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 ${
                activeId === tab.id
                  ? "bg-lf-bg text-lf-text shadow-sm"
                  : "text-lf-muted hover:bg-lf-bg/80 hover:text-lf-text"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
