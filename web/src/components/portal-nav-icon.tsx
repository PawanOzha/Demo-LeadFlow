/**
 * Compact stroke icons for sidebar / drawer nav (no extra deps).
 * Color inherits from parent link via currentColor.
 */
export function PortalNavIcon({ href }: { href: string }) {
  const h = href.toLowerCase();
  const cls =
    "pointer-events-none h-[18px] w-[18px] shrink-0 stroke-current opacity-[0.92]";

  if (h.includes("/import")) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 4v12m0 0l-3.5-3.5M12 16l3.5-3.5M5 20h14"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (h.includes("add-user")) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="9" cy="7" r="4" strokeWidth="1.75" />
        <path
          d="M3 21v-1.2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4V21"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 8v6m3-3h-6"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (h.includes("/settings")) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3" strokeWidth="1.75" />
        <path
          d="M12 2v2.5M12 19.5V22M3 12h2.5M18.5 12H22M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (h.includes("/report")) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M18 20V10M12 20V4M6 20v-6"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (h.includes("transfer-log")) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 7h12M8 12h12M8 17h8"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 7h.01M4 12h.01M4 17h.01"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  /* Team roster — path ends with /team (not team-lead segment ambiguity: use /team as segment) */
  if (h.endsWith("/team")) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (h.includes("/leads")) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  /* Default: dashboard / home */
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
