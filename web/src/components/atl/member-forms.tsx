"use client";

import { useActionState, useRef, useState } from "react";
import {
  createLeadAnalystMember,
  createMainTeamLeadAndTeam,
} from "@/app/actions/atl";

type AnalystResult =
  | { error: string }
  | {
      ok: true;
      name: string;
      email: string;
      analystTeamName: string;
      temporaryPassword: string;
    };

type MtlResult =
  | { error: string }
  | {
      ok: true;
      teamName: string;
      leadName: string;
      email: string;
      temporaryPassword: string;
    };

function formClassName(variant: "page" | "modal") {
  return variant === "modal"
    ? "flex h-fit w-full flex-col gap-3"
    : "flex h-fit w-full flex-col gap-3 rounded-2xl border border-lf-border bg-lf-surface p-5";
}
const inputClass =
  "rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text outline-none ring-lf-brand/35 placeholder:text-lf-subtle focus:ring-2";

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
          <div key={r.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
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
          className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2"
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
              className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2"
            >
              Copy {r.label.toLowerCase()}
            </button>
          ))}
      </div>
    </div>
  );
}

export function AddAnalystForm({
  variant = "page",
  onSuccess,
  defaultAnalystTeamName,
}: {
  variant?: "page" | "modal";
  onSuccess?: () => void;
  /** Prefills team name when the analyst team lead has analystTeamName set */
  defaultAnalystTeamName?: string | null;
} = {}) {
  const [formKey, setFormKey] = useState(0);
  const lastHandledOkEmail = useRef<string | null>(null);

  const [state, action, pending] = useActionState(
    async (_: unknown, fd: FormData) => {
      const result = await createLeadAnalystMember(fd);
      if (
        result &&
        "ok" in result &&
        result.ok &&
        result.email &&
        result.email !== lastHandledOkEmail.current
      ) {
        lastHandledOkEmail.current = result.email;
        if (variant === "page") {
          setFormKey((k) => k + 1);
        }
        onSuccess?.();
      }
      return result;
    },
    undefined as AnalystResult | undefined,
  );

  const success =
    state && "ok" in state && state.ok ? state : null;

  return (
    <form key={variant === "page" ? formKey : "modal"} action={action} className={formClassName(variant)}>
      {variant === "page" ? (
        <h3 className="text-sm font-semibold text-lf-text">Add lead analyst</h3>
      ) : null}
      <input
        name="analystTeamName"
        required
        defaultValue={defaultAnalystTeamName?.trim() || undefined}
        placeholder="Team name (e.g. Team A, North region)"
        className={inputClass}
        autoComplete="off"
        title="Groups this analyst with others under the same label when you manage multiple teams"
      />
      <input
        name="name"
        required
        placeholder="Full name"
        className={inputClass}
        autoComplete="off"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className={inputClass}
        autoComplete="off"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Temporary password"
        className={inputClass}
        autoComplete="new-password"
        minLength={8}
      />
      {state && "error" in state ? (
        <p className="text-sm text-lf-danger">{state.error}</p>
      ) : null}
      {success ? (
        <CopyCredentialsPanel
          title="Account created"
          copyAllLabel="Copy login details"
          copyAllText={`Team: ${success.analystTeamName}\nName: ${success.name}\nEmail: ${success.email}\nPassword: ${success.temporaryPassword}`}
          rows={[
            { label: "Team", value: success.analystTeamName },
            { label: "Name", value: success.name },
            { label: "Email", value: success.email },
            { label: "Password", value: success.temporaryPassword },
          ]}
        />
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
      >
        {pending ? "Saving…" : "Create analyst"}
      </button>
    </form>
  );
}

export function AddMainTeamForm({
  variant = "page",
  onSuccess,
}: {
  variant?: "page" | "modal";
  onSuccess?: () => void;
} = {}) {
  const [formKey, setFormKey] = useState(0);
  const lastHandledOkEmail = useRef<string | null>(null);

  const [state, action, pending] = useActionState(
    async (_: unknown, fd: FormData) => {
      const result = await createMainTeamLeadAndTeam(fd);
      if (
        result &&
        "ok" in result &&
        result.ok &&
        result.email &&
        result.email !== lastHandledOkEmail.current
      ) {
        lastHandledOkEmail.current = result.email;
        if (variant === "page") {
          setFormKey((k) => k + 1);
        }
        onSuccess?.();
      }
      return result;
    },
    undefined as MtlResult | undefined,
  );

  const success =
    state && "ok" in state && state.ok ? state : null;

  return (
    <form key={variant === "page" ? formKey : "modal"} action={action} className={formClassName(variant)}>
      {variant === "page" ? (
        <h3 className="text-sm font-semibold text-lf-text">
          Add main team &amp; team lead
        </h3>
      ) : null}
      <input
        name="teamName"
        required
        placeholder="Team name (e.g. Team B)"
        className={inputClass}
        autoComplete="off"
      />
      <input
        name="leadName"
        required
        placeholder="Main team lead full name"
        className={inputClass}
        autoComplete="off"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Main team lead email"
        className={inputClass}
        autoComplete="off"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Temporary password"
        className={inputClass}
        autoComplete="new-password"
        minLength={8}
      />
      {state && "error" in state ? (
        <p className="text-sm text-lf-danger">{state.error}</p>
      ) : null}
      {success ? (
        <CopyCredentialsPanel
          title="Team &amp; main team lead created"
          copyAllLabel="Copy all details"
          copyAllText={`Team: ${success.teamName}\nMain team lead: ${success.leadName}\nEmail: ${success.email}\nPassword: ${success.temporaryPassword}`}
          rows={[
            { label: "Team", value: success.teamName },
            { label: "Main team lead", value: success.leadName },
            { label: "Email", value: success.email },
            { label: "Password", value: success.temporaryPassword },
          ]}
        />
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
      >
        {pending ? "Saving…" : "Create team & lead"}
      </button>
    </form>
  );
}
