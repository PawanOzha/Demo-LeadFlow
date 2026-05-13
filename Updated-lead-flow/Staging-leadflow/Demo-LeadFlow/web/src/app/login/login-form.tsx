"use client";

import { useActionState } from "react";
import { loginFormAction } from "@/app/actions/login-form";
import { PasswordInputWithToggle } from "@/components/ui/password-input-with-toggle";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginFormAction, undefined);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <label className="block text-sm font-medium text-lf-text-secondary">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-2 min-h-10 w-full rounded-md border border-lf-border bg-lf-surface px-3 py-2 text-sm text-lf-text outline-none placeholder:text-lf-subtle focus:border-lf-brand focus:ring-2 focus:ring-lf-brand/20 focus:ring-offset-2 focus:ring-offset-lf-surface"
        />
      </label>
      <label className="block text-sm font-medium text-lf-text-secondary">
        Password
        <PasswordInputWithToggle
          name="password"
          required
          autoComplete="current-password"
          wrapperClassName="mt-2"
          className="min-h-10 w-full rounded-md border border-lf-border bg-lf-surface px-3 py-2 text-sm text-lf-text outline-none placeholder:text-lf-subtle focus:border-lf-brand focus:ring-2 focus:ring-lf-brand/20 focus:ring-offset-2 focus:ring-offset-lf-surface"
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-lf-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-10 rounded-md bg-lf-accent px-5 py-2.5 text-sm font-semibold text-lf-on-accent transition duration-200 ease-out hover:bg-lf-accent-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-lf-bg"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
