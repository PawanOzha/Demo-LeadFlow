"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { transferSalesExecutiveToTeam } from "@/app/actions/mtl";

export type TransferTeamOption = {
  id: string;
  name: string;
  mainTeamLeadName: string;
};

function TransferModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
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
      aria-labelledby="mtl-transfer-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-lf-border bg-lf-surface p-5 shadow-2xl sm:p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="mtl-transfer-title"
            className="min-w-0 pr-2 text-lg font-semibold tracking-tight text-lf-text"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-lf-label transition-colors hover:bg-lf-row-hover hover:text-lf-text"
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

function TransferExecForm({
  execId,
  execName,
  teams,
  onSuccess,
  onCancel,
}: {
  execId: string;
  execName: string;
  teams: TransferTeamOption[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (_: { error?: string; ok?: boolean } | undefined, fd: FormData) => {
      return transferSalesExecutiveToTeam(fd);
    },
    undefined as { error?: string; ok?: boolean } | undefined,
  );

  useEffect(() => {
    if (state?.ok) onSuccess();
  }, [state?.ok, onSuccess]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-lf-border bg-lf-bg/50 p-4">
        <p className="text-sm leading-relaxed text-lf-text-secondary">
          Move{" "}
          <span className="font-semibold text-lf-text">{execName}</span> to
          another sales team. They keep the same sign-in; their new main team
          lead will see them on the Sales team page.
        </p>
        <p className="mt-3 border-t border-lf-border/80 pt-3 text-xs leading-relaxed text-lf-subtle">
          Active leads on your pipeline that are still assigned to this rep
          (with rep) return to your queue without a rep so you can reassign.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="salesExecId" value={execId} />
        <div>
          <label
            htmlFor={`mtl-transfer-team-${execId}`}
            className="block text-xs font-semibold uppercase tracking-wide text-lf-muted"
          >
            Destination team
          </label>
          <select
            id={`mtl-transfer-team-${execId}`}
            name="targetTeamId"
            required
            className="mt-2 h-10 w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-bg px-3 text-[13px] text-lf-text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-lf-brand"
            defaultValue=""
          >
            <option value="" disabled>
              Select a team
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.mainTeamLeadName}
              </option>
            ))}
          </select>
        </div>
        {state?.error ? (
          <p className="text-sm text-lf-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-lf-border bg-lf-surface px-4 text-sm font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 focus:ring-offset-lf-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-lg bg-lf-accent px-5 text-sm font-semibold text-white shadow-sm shadow-lf-brand/15 transition-colors hover:bg-lf-accent-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 focus:ring-offset-lf-surface disabled:opacity-40"
          >
            {pending ? "Transferring…" : "Confirm transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function MtlTransferExecButton({
  execId,
  execName,
  teams,
}: {
  execId: string;
  execName: string;
  teams: TransferTeamOption[];
}) {
  const [open, setOpen] = useState(false);
  const [formMountKey, setFormMountKey] = useState(0);

  const noDestinations = teams.length === 0;

  const handleSuccess = useCallback(() => {
    setOpen(false);
    setFormMountKey((k) => k + 1);
  }, []);

  const closeModal = useCallback(() => setOpen(false), []);

  const overlay =
    open && typeof document !== "undefined" ? (
      <TransferModal title="Transfer to another team" onClose={closeModal}>
        {noDestinations ? (
          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-lf-muted">
              There are no other teams in the system to transfer this
              representative to.
            </p>
            <div className="flex justify-end border-t border-lf-border pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="h-10 rounded-lg bg-lf-accent px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-lf-accent-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 focus:ring-offset-lf-surface"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <TransferExecForm
            key={formMountKey}
            execId={execId}
            execName={execName}
            teams={teams}
            onSuccess={handleSuccess}
            onCancel={closeModal}
          />
        )}
      </TransferModal>
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={noDestinations}
        title={
          noDestinations
            ? "No other teams available"
            : "Transfer to another sales team"
        }
        className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Transfer
      </button>
      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
