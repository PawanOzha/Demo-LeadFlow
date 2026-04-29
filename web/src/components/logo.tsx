import type { ReactNode } from "react";

const BRAND = "#0066ff";
const INK = "#1a1a1a";

/** Pipeline mark — brand blue + white (Zoho-style CRM chrome). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line
        x1="14"
        y1="20"
        x2="15"
        y2="20"
        stroke={BRAND}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.95"
      />
      <line
        x1="25"
        y1="20"
        x2="26"
        y2="20"
        stroke={BRAND}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="10" cy="20" r="4" fill={BRAND} />
      <circle cx="20" cy="20" r="5" fill="#ffffff" stroke={INK} strokeWidth="1" />
      <circle cx="30" cy="20" r="4" fill={BRAND} />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline gap-0 font-semibold tracking-tight ${className ?? ""}`}
    >
      <span className="text-lf-text">Lead</span>
      <span className="text-lf-brand">Flow</span>
    </span>
  );
}

export function LogoFull({
  className,
  tagline,
  markClassName,
}: {
  className?: string;
  tagline?: ReactNode;
  markClassName?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <LogoMark className={`h-10 w-10 shrink-0 ${markClassName ?? ""}`} />
      <div className="min-w-0">
        <LogoWordmark className="text-lg sm:text-xl" />
        {tagline ? (
          <p className="mt-0.5 truncate text-sm text-lf-subtle">{tagline}</p>
        ) : null}
      </div>
    </div>
  );
}
