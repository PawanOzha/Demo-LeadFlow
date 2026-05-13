"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

function PasswordVisibilityIcon({ revealed }: { revealed: boolean }) {
  if (revealed) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.6 10.6a2 2 0 102.8 2.8M9.9 5.1A10.8 10.8 0 0112 5c5.4 0 9.1 3.7 10 7-.3 1-1 2.2-2 3.3M6.2 6.2C4 7.7 2.6 9.9 2 12c1 3.3 4.6 7 10 7 2.1 0 3.9-.6 5.4-1.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M2 12c.9-3.3 4.6-7 10-7s9.1 3.7 10 7c-.9 3.3-4.6 7-10 7s-9.1-3.7-10-7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export type PasswordInputWithToggleProps = Omit<
  ComponentProps<"input">,
  "type"
> & {
  wrapperClassName?: string;
};

/**
 * Password field with an eye toggle to show or hide the value (local UI only).
 */
export function PasswordInputWithToggle({
  className,
  wrapperClassName,
  disabled,
  ...props
}: PasswordInputWithToggleProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <input
        {...props}
        type={revealed ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setRevealed((v) => !v)}
        aria-label={revealed ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-2 inline-flex items-center text-lf-muted transition-colors hover:text-lf-text disabled:pointer-events-none disabled:opacity-40"
      >
        <PasswordVisibilityIcon revealed={revealed} />
      </button>
    </div>
  );
}
