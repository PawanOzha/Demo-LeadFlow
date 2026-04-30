"use client";

import { useActionState, useState } from "react";
import { loginFormAction } from "@/app/actions/login-form";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginFormAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <label className="block text-sm font-medium text-lf-text-secondary">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-2 min-h-11 w-full rounded-lg border border-lf-border bg-lf-surface px-[13px] py-[9px] text-[13.5px] text-lf-text outline-none transition placeholder:text-lf-subtle focus:border-lf-brand focus:ring-[3px] focus:ring-lf-brand/20"
        />
      </label>
      <label className="block text-sm font-medium text-lf-text-secondary">
        Password
        <div className="relative mt-2">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="min-h-11 w-full rounded-lg border border-lf-border bg-lf-surface px-[13px] py-[9px] pr-12 text-[13.5px] text-lf-text outline-none transition placeholder:text-lf-subtle focus:border-lf-brand focus:ring-[3px] focus:ring-lf-brand/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-3 inline-flex items-center text-lf-muted hover:text-lf-text"
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M3 3l18 18M10.6 10.6a2 2 0 102.8 2.8M9.9 5.1A10.8 10.8 0 0112 5c5.4 0 9.1 3.7 10 7-.3 1-1 2.2-2 3.3M6.2 6.2C4 7.7 2.6 9.9 2 12c1 3.3 4.6 7 10 7 2.1 0 3.9-.6 5.4-1.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
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
            )}
          </button>
        </div>
      </label>
      {state?.error ? (
        <p className="text-sm text-lf-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-lf-accent px-[22px] py-2.5 text-[13.5px] font-semibold text-lf-on-accent shadow-sm transition duration-150 ease-out hover:opacity-[0.85] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-lf-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-lf-bg active:scale-[0.99]"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-lf-subtle">
        First-time cloud deploy creates only{" "}
        <code className="text-lf-muted">superadmin@demo.local</code> (password{" "}
        <code className="text-lf-muted">password123</code>). After a full{" "}
        <code className="text-lf-muted">npm run db:seed</code>, see demo data in{" "}
        <code className="text-lf-muted">database/seed.ts</code>.
      </p>
    </form>
  );
}
