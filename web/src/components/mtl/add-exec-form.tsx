"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createSalesExecutive } from "@/app/actions/mtl";

type Result =
  | { error: string }
  | {
      ok: true;
      name: string;
      email: string;
      temporaryPassword: string;
    }
  | undefined;

function CopyCredentialsPanel({
  title,
  copyAllLabel,
  copyAllText,
  rows,
}: {
  title: string;
  copyAllLabel: string;
  copyAllText: string;
  rows: { label: string; value: string }[];
}) {
  const [copied, setCopied] = useState<"all" | null>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("all");
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="rounded-lg border border-lf-border bg-lf-bg/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-lf-link">
        {title}
      </p>
      <p className="mt-1 text-xs text-lf-muted">
        Share these details with the user once. Copy and store securely.
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
          >
            <dt className="shrink-0 text-lf-subtle">{r.label}</dt>
            <dd className="break-all font-mono text-xs text-lf-text sm:text-right">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(copyAllText)}
          className="rounded-lg bg-lf-accent px-3 py-2 text-xs font-semibold text-lf-on-accent hover:bg-lf-accent-hover"
        >
          {copied === "all" ? "Copied" : copyAllLabel}
        </button>
        {rows
          .filter((r) => r.label === "Email" || r.label === "Password")
          .map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => copy(r.value)}
              className="rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-xs font-medium text-lf-muted hover:bg-lf-bg/50 hover:text-lf-text"
            >
              Copy {r.label.toLowerCase()}
            </button>
          ))}
      </div>
    </div>
  );
}

/** Fixed field size: 400×36px (responsive cap on narrow viewports). */
const fieldBox =
  "box-border h-[36px] w-[400px] max-w-full rounded-lg border px-3 text-sm";

const inputClass = `${fieldBox} border-lf-border bg-lf-bg py-0 leading-[36px] text-lf-text outline-none ring-lf-brand/35 placeholder:text-lf-subtle focus:ring-2`;

const teamFieldClass = `${fieldBox} flex items-center border-lf-border bg-lf-elevated font-medium text-lf-text`;

const labelClass = "mb-1.5 block text-xs font-medium text-lf-subtle";

export default function AddExecForm({
  variant = "page",
  onCreated,
  teamName = null,
}: {
  variant?: "page" | "modal";
  onCreated?: () => void;
  /** Sales team name from the main team lead’s account; assignment is server-side. */
  teamName?: string | null;
} = {}) {
  const [formKey, setFormKey] = useState(0);
  const refreshedForEmail = useRef<string | null>(null);

  const [state, action, pending] = useActionState(
    async (_: Result, fd: FormData) => {
      const result = await createSalesExecutive(fd);
      return result as Result;
    },
    undefined as Result,
  );

  const success =
    state && "ok" in state && state.ok ? state : undefined;

  useEffect(() => {
    if (!success || !onCreated) return;
    if (refreshedForEmail.current === success.email) return;
    refreshedForEmail.current = success.email;
    onCreated();
  }, [success, onCreated]);

  const shell =
    variant === "modal"
      ? "space-y-0"
      : "rounded-2xl border border-lf-border bg-lf-surface p-5";

  return (
    <div className={shell}>
      <h2
        id={variant === "modal" ? "mtl-add-exec-heading" : undefined}
        className={`text-base font-semibold text-lf-text ${variant === "modal" ? "pr-10" : ""}`}
      >
        Add sales executive
      </h2>
      <p
        className={`mt-1 text-sm text-lf-muted ${variant === "modal" ? "pr-10" : ""}`}
      >
        The new rep is added to your team automatically. Set a temporary
        password to share offline.
      </p>

      <form
        key={formKey}
        action={action}
        className="mt-5 flex flex-col gap-4"
      >
        <div>
          <span className={labelClass}>Team</span>
          <div className={teamFieldClass} role="status">
            {teamName ?? "No team linked to your account"}
          </div>
          <p className="mt-1 text-xs text-lf-subtle">
            Assigned from your main team lead profile — not editable here.
          </p>
        </div>

        <div>
          <label htmlFor="mtl-exec-name" className={labelClass}>
            Profile name
          </label>
          <input
            id="mtl-exec-name"
            name="name"
            required
            placeholder="Profile name"
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="mtl-exec-email" className={labelClass}>
            Email
          </label>
          <input
            id="mtl-exec-email"
            name="email"
            type="email"
            required
            placeholder="name@company.com"
            autoComplete="off"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="mtl-exec-password" className={labelClass}>
            Password
          </label>
          <input
            id="mtl-exec-password"
            name="password"
            type="password"
            required
            placeholder="Temporary password (min. 8 characters)"
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        {state && "error" in state && state.error ? (
          <p className="text-sm text-lf-danger">{state.error}</p>
        ) : null}
        {!teamName ? (
          <p className="text-sm text-lf-warning">
            You must be linked to a sales team before adding executives.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || !teamName}
          className="box-border h-[36px] w-[400px] max-w-full rounded-lg bg-lf-accent text-sm font-semibold text-lf-on-accent hover:bg-lf-accent-hover disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create executive"}
        </button>
      </form>

      {success ? (
        <div className="mt-6 space-y-4">
          <CopyCredentialsPanel
            title="Credentials"
            copyAllLabel="Copy all"
            copyAllText={`Team: ${teamName ?? "—"}\nProfile name: ${success.name}\nEmail: ${success.email}\nPassword: ${success.temporaryPassword}`}
            rows={[
              ...(teamName
                ? [{ label: "Team", value: teamName } as const]
                : []),
              { label: "Profile name", value: success.name },
              { label: "Email", value: success.email },
              { label: "Password", value: success.temporaryPassword },
            ]}
          />
          <button
            type="button"
            onClick={() => {
              setFormKey((k) => k + 1);
            }}
            className="text-sm font-medium text-lf-muted hover:text-lf-text"
          >
            Add another
          </button>
        </div>
      ) : null}
    </div>
  );
}
