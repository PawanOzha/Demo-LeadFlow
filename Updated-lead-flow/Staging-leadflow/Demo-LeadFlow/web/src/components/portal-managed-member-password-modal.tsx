"use client";

import {
  useActionState,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { PasswordInputWithToggle } from "@/components/ui/password-input-with-toggle";
import {
  readManagedMemberPassword,
  rememberManagedMemberPassword,
} from "@/lib/managed-member-password-session";

export type ManagedMemberPasswordFormAction = (
  _prev: { error?: string; password?: string } | undefined,
  formData: FormData,
) => Promise<{ error?: string; password?: string } | undefined>;

function CenteredPortalDialog({
  titleHeadingId,
  title,
  subtitle,
  onClose,
  children,
}: {
  titleHeadingId: string;
  title: string;
  subtitle: string | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-black/65 p-4 py-12 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleHeadingId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id={titleHeadingId}
              className="text-lg font-semibold tracking-tight text-lf-text"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 line-clamp-3 text-sm text-lf-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 shrink-0 rounded-lg p-2 text-lf-label transition-colors hover:bg-lf-row-hover hover:text-lf-text"
            aria-label="Close"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

/** Compact trigger + centered modal — use for ATL-, MTL-, and superadmin-managed members. */
export function ManagedMemberPasswordModalTrigger({
  userId,
  memberLabel,
  mustResetPassword = false,
  formAction,
}: {
  userId: string;
  memberLabel: string;
  mustResetPassword?: boolean;
  formAction: ManagedMemberPasswordFormAction;
}) {
  const titleHeadingId = useId();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionHint, setSessionHint] = useState("");
  const [state, submitAction, pending] = useActionState(formAction, undefined);

  useEffect(() => {
    setSessionHint(readManagedMemberPassword(userId) ?? "");
  }, [userId]);

  useEffect(() => {
    if (state?.password) {
      rememberManagedMemberPassword(userId, state.password);
      setSessionHint(state.password);
    }
  }, [state?.password, userId]);

  const savedPassword = state?.password ?? sessionHint;

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);

  const displayValue = useMemo(() => {
    if (!savedPassword) return { kind: "empty" as const };
    if (visible) return { kind: "plain" as const, text: savedPassword };
    return {
      kind: "masked" as const,
      text: "•".repeat(Math.max(savedPassword.length, 10)),
    };
  }, [savedPassword, visible]);

  async function copyPassword() {
    if (!savedPassword) return;
    try {
      await navigator.clipboard.writeText(savedPassword);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  }

  const hintLine = savedPassword
    ? "Stored in this browser tab only—not on our servers."
    : mustResetPassword
      ? "Not shown unless you saved it after invite—or set one below."
      : "Set a password below. After Update, copy it anytime in this tab.";

  const actionBtnClass =
    "rounded-md px-3 py-1.5 text-xs font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover hover:text-lf-text disabled:pointer-events-none disabled:opacity-35";

  const modalInner = (
    <form action={submitAction} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />

      {mustResetPassword ? (
        <div className="rounded-lg border border-amber-400/35 bg-amber-500/[0.08] px-3 py-2 text-xs text-lf-muted">
          <strong className="font-semibold text-lf-text">
            Must reset password:
          </strong>{" "}
          This member may still be on their first login—or use a provisional
          password you never captured. Set one they can rotate at sign-in per
          your policy.
        </div>
      ) : null}

      <div className="rounded-xl border border-lf-border bg-lf-bg/60 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
          Current password (this tab)
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 rounded-lg border border-lf-border bg-lf-bg px-2.5 py-2">
            {displayValue.kind === "empty" ? (
              <span className="text-sm text-lf-subtle">Not captured yet</span>
            ) : (
              <span
                className={`block break-all font-mono text-[13px] leading-snug ${
                  displayValue.kind === "masked"
                    ? "tracking-wider text-lf-muted"
                    : "text-lf-text"
                }`}
                title={
                  displayValue.kind === "plain" ? displayValue.text : undefined
                }
              >
                {displayValue.text}
              </span>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={copyPassword}
              disabled={!savedPassword}
              className={actionBtnClass}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              disabled={!savedPassword}
              className={actionBtnClass}
            >
              {visible ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </div>

      {state?.error ? (
        <p className="text-sm text-lf-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.password ? (
        <p className="text-sm font-medium text-lf-success">Saved.</p>
      ) : null}

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-lf-muted">
          New password (8+ characters)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PasswordInputWithToggle
            name="password"
            minLength={8}
            placeholder="Enter new password"
            autoComplete="new-password"
            wrapperClassName="min-w-0 flex-1"
            className="h-10 w-full rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text outline-none placeholder:text-lf-subtle ring-lf-brand/30 focus:ring-2"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-10 shrink-0 rounded-lg bg-lf-accent px-5 text-sm font-semibold text-white shadow-sm shadow-lf-brand/15 transition-colors hover:bg-lf-accent-hover disabled:opacity-40"
          >
            {pending ? "Saving…" : "Update"}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-lf-subtle">{hintLine}</p>
      </div>
    </form>
  );

  const subtitle = memberLabel.trim() || `User ${userId.slice(0, 8)}…`;

  const overlay =
    typeof document !== "undefined" &&
    open &&
    createPortal(
      <CenteredPortalDialog
        titleHeadingId={titleHeadingId}
        title="Password"
        subtitle={subtitle}
        onClose={() => setOpen(false)}
      >
        {modalInner}
      </CenteredPortalDialog>,
      document.body,
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 text-left text-[12px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 focus:ring-offset-lf-surface ${
          mustResetPassword
            ? "border-lf-brand/35 bg-lf-brand/[0.07] text-lf-text-secondary hover:bg-lf-brand/[0.12]"
            : "border-lf-border bg-lf-surface text-lf-text-secondary hover:bg-lf-row-hover"
        }`}
        title={
          savedPassword ? "Manage password for this member" : "Set password"
        }
      >
        {mustResetPassword ? (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
          />
        ) : null}
        <span>
          {savedPassword ? "Manage" : mustResetPassword ? "Set password" : "Password"}
        </span>
      </button>
      {overlay}
    </>
  );
}
