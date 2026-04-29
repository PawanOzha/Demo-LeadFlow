"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";

export type AtlNotificationItem = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  leadId: string | null;
  createdAt: string;
};

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function PortalNotificationBell({
  initialItems,
  initialUnread,
  leadsHref = "/analyst-team-lead/leads",
}: {
  initialItems: AtlNotificationItem[];
  initialUnread: number;
  /** Where notification links go when opened (per portal). */
  leadsHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }
  }, [open]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const onMarkRead = async (id: string) => {
    const res = await markNotificationRead(id);
    if ("ok" in res && res.ok) {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnread((u) => Math.max(0, u - 1));
      refresh();
    }
  };

  const onMarkAll = async () => {
    const res = await markAllNotificationsRead();
    if ("ok" in res && res.ok) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
      refresh();
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-lf-border bg-lf-surface text-lf-muted transition hover:bg-lf-bg/50 hover:text-lf-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-link/50 focus-visible:ring-offset-2 focus-visible:ring-offset-lf-bg"
        title="Notifications"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-lf-danger px-1 text-[10px] font-bold text-lf-on-accent">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-lf-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-lf-subtle">
              Notifications
            </p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void onMarkAll()}
                className="text-xs font-medium text-lf-link hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-[min(70vh,24rem)] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-lf-subtle">
                No notifications yet. Alerts about your leads will appear here.
              </li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-lf-border last:border-0 ${
                    !n.read ? "bg-lf-link/5" : ""
                  }`}
                >
                  <Link
                    href={leadsHref}
                    prefetch={true}
                    className="block px-4 py-3 text-left transition hover:bg-lf-bg/50"
                    onClick={() => {
                      if (!n.read) void onMarkRead(n.id);
                      setOpen(false);
                    }}
                  >
                    <p className="text-sm font-medium text-lf-text">{n.title}</p>
                    {n.body ? (
                      <p className="mt-0.5 text-xs text-lf-muted">{n.body}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-lf-subtle">
                      {formatWhen(n.createdAt)}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
