"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { superadminSetPasswordFormAction } from "@/app/actions/superadmin";

function deriveSavedPassword(
  state: { password?: string; error?: string } | undefined,
  initialPassword: string | null | undefined,
): string {
  return state?.password ?? initialPassword ?? "";
}

const inputClass =
  "min-h-10 w-full min-w-[140px] max-w-[200px] rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text outline-none ring-lf-brand/35 focus:ring-2";

export function SuperadminPasswordForm({
  userId,
  initialPassword,
}: {
  userId: string;
  initialPassword?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(
    superadminSetPasswordFormAction,
    undefined,
  );
  const savedPassword = deriveSavedPassword(state, initialPassword);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);
  const shownPassword = useMemo(() => {
    if (!savedPassword) return "Not set";
    if (visible) return savedPassword;
    return "•".repeat(Math.max(savedPassword.length, 8));
  }, [savedPassword, visible]);

  async function copyPassword() {
    if (!savedPassword) return;
    try {
      await navigator.clipboard.writeText(savedPassword);
      setCopied(true);
    } catch {
      // Keep UI quiet if clipboard permission is blocked.
    }
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="rounded-md border border-lf-border bg-lf-bg px-2 py-1.5">
        <p className="text-[10px] uppercase tracking-wide text-lf-subtle">
          Current password
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-lf-text-secondary">
            {shownPassword}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copyPassword}
              disabled={!savedPassword}
              className="h-9 rounded-lg px-3 text-[13px] font-medium text-lf-label transition-colors hover:bg-lf-row-hover hover:text-lf-text disabled:opacity-40"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="h-9 rounded-lg px-3 text-[13px] font-medium text-lf-label transition-colors hover:bg-lf-row-hover hover:text-lf-text"
            >
              {visible ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </div>
      {state?.error ? (
        <p className="text-xs text-lf-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.password ? (
        <p className="text-xs text-lf-success">Password updated and saved.</p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="password"
          type="password"
          minLength={8}
          placeholder="New password"
          autoComplete="new-password"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="h-9 shrink-0 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
        >
          {pending ? "…" : "Set"}
        </button>
      </div>
    </form>
  );
}
