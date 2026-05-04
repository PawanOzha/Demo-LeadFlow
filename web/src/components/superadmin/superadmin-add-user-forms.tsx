"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { superadminCreateUserFormAction } from "@/app/actions/superadmin";
import { UserRole } from "@/lib/constants";

const inputClass =
  "h-9 w-full min-w-[140px] rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-lf-brand";

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-lf-muted transition ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Modal({
  titleId,
  title,
  children,
  onClose,
}: {
  titleId: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[8vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-lf-border bg-lf-surface p-6 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-lf-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-lf-subtle hover:bg-lf-bg/50 hover:text-lf-text"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

function AddLeadAnalystForm({
  atlas,
  laState,
  laAction,
  laPending,
}: {
  atlas: {
    id: string;
    name: string;
    email: string;
    analystTeamName: string | null;
  }[];
  laState: { error?: string; temporaryPassword?: string } | undefined;
  laAction: (formData: FormData) => void;
  laPending: boolean;
}) {
  const [managerId, setManagerId] = useState("");
  const [analystTeamName, setAnalystTeamName] = useState("");
  const wasLaPending = useRef(false);

  const onManagerChange = (id: string) => {
    setManagerId(id);
    if (!id) {
      setAnalystTeamName("");
      return;
    }
    const atl = atlas.find((a) => a.id === id);
    setAnalystTeamName(atl?.analystTeamName?.trim() ?? "");
  };

  /* Reset after successful server action — useActionState exposes no onSuccess callback. */
  useEffect(() => {
    if (
      wasLaPending.current &&
      !laPending &&
      !laState?.error &&
      !laState?.temporaryPassword
    ) {
      queueMicrotask(() => {
        setManagerId("");
        setAnalystTeamName("");
      });
    }
    wasLaPending.current = laPending;
  }, [laPending, laState]);

  return (
    <form action={laAction} className="space-y-4" autoComplete="off">
      <input type="hidden" name="role" value={UserRole.LEAD_ANALYST} />
        {laState?.error ? (
          <p className="text-sm text-lf-danger" role="alert">
            {laState.error}
          </p>
        ) : null}
        {laState?.temporaryPassword ? (
          <p className="rounded-lg bg-lf-success/15 p-3 text-sm text-lf-text-secondary">
            User created. One-time password:{" "}
            <code className="font-mono font-semibold">
              {laState.temporaryPassword}
            </code>{" "}
            (copy now — it will not be shown again.)
          </p>
        ) : null}
      <label className="block text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        Name
        <input name="name" required className={`mt-1 ${inputClass}`} />
      </label>
      <label className="block text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          className={`mt-1 ${inputClass} appearance-none`}
        />
      </label>
      <label className="block text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="block text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        Analyst team lead
        <select
          name="managerId"
          required
          value={managerId}
          onChange={(e) => onManagerChange(e.target.value)}
          className={`mt-1 ${inputClass}`}
        >
          <option value="">Select…</option>
          {atlas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.analystTeamName ? `${a.analystTeamName} · ` : ""}
              {a.name} ({a.email})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        Analyst team name
        <input
          name="analystTeamName"
          required
          value={managerId ? analystTeamName : ""}
          onChange={(e) => {
            if (!managerId) return;
            setAnalystTeamName(e.target.value);
          }}
          className={`mt-1 ${inputClass}`}
          placeholder="e.g. North America"
          autoComplete="off"
        />
      </label>
      <p className="text-xs text-lf-subtle">
        Fills from the selected team lead’s cohort name; you can edit before creating.
      </p>
      <button
        type="submit"
        disabled={laPending}
        className="h-9 w-full rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
      >
        {laPending ? "Creating…" : "Create"}
      </button>
    </form>
  );
}

function AddAnalystTeamLeadForm({
  atlState,
  atlAction,
  atlPending,
}: {
  atlState: { error?: string; temporaryPassword?: string } | undefined;
  atlAction: (formData: FormData) => void;
  atlPending: boolean;
}) {
  return (
    <form action={atlAction} className="space-y-4" autoComplete="off">
      <input type="hidden" name="role" value={UserRole.ANALYST_TEAM_LEAD} />
      {atlState?.error ? (
        <p className="text-sm text-lf-danger" role="alert">
          {atlState.error}
        </p>
      ) : null}
      {atlState?.temporaryPassword ? (
        <p className="rounded-lg bg-lf-success/15 p-3 text-sm text-lf-text-secondary">
          User created. One-time password:{" "}
          <code className="font-mono font-semibold">
            {atlState.temporaryPassword}
          </code>{" "}
          (copy now — it will not be shown again.)
        </p>
      ) : null}
      <label className="block text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        Name
        <input name="name" required className={`mt-1 ${inputClass}`} />
      </label>
      <label className="block text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="block text-[12px] font-medium uppercase tracking-wide text-lf-muted">
        Team name
        <input
          name="analystTeamName"
          required
          className={`mt-1 ${inputClass}`}
          placeholder="e.g. North America analysts"
          autoComplete="off"
        />
      </label>
      <label className="block text-xs font-medium text-lf-subtle">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <button
        type="submit"
        disabled={atlPending}
        className="h-9 w-full rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
      >
        {atlPending ? "Creating…" : "Create"}
      </button>
    </form>
  );
}

function AddUserCardMenu({
  onPick,
}: {
  onPick: (kind: "atl" | "la") => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }
  }, [open]);

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 max-w-full shrink-0 items-center gap-2 rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 sm:gap-2.5 sm:px-3.5"
      >
        <span className="whitespace-nowrap font-semibold text-lf-text">
          Add user
        </span>
        <span className="hidden whitespace-nowrap text-xs font-normal text-lf-muted lg:inline">
          · ATL or Lead Analyst
        </span>
        <ChevronDown open={open} />
      </button>
      {open ? (
        <div
          className="absolute right-0 z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-lg"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full cursor-pointer px-3 py-2 text-left text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover"
            onClick={() => {
              onPick("atl");
              setOpen(false);
            }}
          >
            Analyst Team Lead
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full cursor-pointer px-3 py-2 text-left text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover"
            onClick={() => {
              onPick("la");
              setOpen(false);
            }}
          >
            Lead Analyst
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SuperadminAddUserCard({
  atlas,
}: {
  atlas: {
    id: string;
    name: string;
    email: string;
    analystTeamName: string | null;
  }[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"atl" | "la" | null>(null);
  const [atlState, atlAction, atlPending] = useActionState(
    superadminCreateUserFormAction,
    undefined,
  );
  const [laState, laAction, laPending] = useActionState(
    superadminCreateUserFormAction,
    undefined,
  );

  const wasAtlPending = useRef(false);
  const wasLaPending = useRef(false);

  useEffect(() => {
    if (wasAtlPending.current && !atlPending && atlState?.temporaryPassword) {
      router.refresh();
    }
    wasAtlPending.current = atlPending;
  }, [atlPending, atlState, router]);

  useEffect(() => {
    if (wasLaPending.current && !laPending && laState?.temporaryPassword) {
      router.refresh();
    }
    wasLaPending.current = laPending;
  }, [laPending, laState, router]);

  return (
    <>
      <AddUserCardMenu
        onPick={(kind) => {
          setModal(kind);
        }}
      />
      {modal === "atl" ? (
        <Modal
          titleId="superadmin-add-atl-title"
          title="Add Analyst Team Lead"
          onClose={() => setModal(null)}
        >
          <AddAnalystTeamLeadForm
            atlState={atlState}
            atlAction={atlAction}
            atlPending={atlPending}
          />
        </Modal>
      ) : null}
      {modal === "la" ? (
        <Modal
          titleId="superadmin-add-la-title"
          title="Add Lead Analyst"
          onClose={() => setModal(null)}
        >
          <AddLeadAnalystForm
            atlas={atlas}
            laState={laState}
            laAction={laAction}
            laPending={laPending}
          />
        </Modal>
      ) : null}
    </>
  );
}
