"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeMandatoryPasswordResetAction } from "@/app/actions/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const res = await completeMandatoryPasswordResetAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (res && "ok" in res && res.ok && "redirectTo" in res && res.redirectTo) {
        router.replace(res.redirectTo);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm text-lf-muted">
        New password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
        />
      </label>
      <label className="block text-sm text-lf-muted">
        Confirm password
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
        />
      </label>
      {error ? (
        <p className="text-sm text-lf-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-lf-accent py-2.5 text-sm font-semibold text-lf-on-accent hover:bg-lf-accent-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
