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

function Modal({
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
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[10vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mtl-transfer-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-lf-border bg-lf-surface p-6 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-lf-subtle hover:bg-lf-bg/50 hover:text-lf-text"
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
        <h2
          id="mtl-transfer-title"
          className="pr-10 text-lg font-semibold text-lf-text"
        >
          {title}
        </h2>
        {children}
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
    <>
      <p className="mt-2 text-sm text-lf-muted">
        Move <span className="font-medium text-lf-text-secondary">{execName}</span> to a
        different sales team. They will sign in as before; their new main team
        lead will see them on the Sales team page.
      </p>
      <p className="mt-3 text-xs text-lf-subtle">
        Any active leads still assigned to them on your pipeline (with rep) will
        return to your queue without a rep so you can reassign.
      </p>
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="salesExecId" value={execId} />
        <label className="block text-sm text-lf-muted">
          Destination team
          <select
            name="targetTeamId"
            required
            className="mt-1 w-full rounded-lg border border-lf-border bg-lf-bg px-3 py-2.5 text-sm text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
            defaultValue=""
          >
            <option value="" disabled>
              Select team
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.mainTeamLeadName}
              </option>
            ))}
          </select>
        </label>
        {state?.error ? (
          <p className="text-sm text-lf-danger">{state.error}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-lf-accent px-4 py-2.5 text-sm font-semibold text-lf-on-accent hover:bg-lf-accent-hover disabled:opacity-50"
          >
            {pending ? "Transferring…" : "Confirm transfer"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-lf-border px-4 py-2.5 text-sm font-medium text-lf-muted hover:bg-lf-bg/50 hover:text-lf-text"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
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

  const modal =
    open && typeof document !== "undefined" ? (
      <Modal title="Transfer to another team" onClose={() => setOpen(false)}>
        {noDestinations ? (
          <>
            <p className="mt-2 text-sm text-lf-muted">
              There are no other teams in the system to transfer to.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 rounded-lg border border-lf-border px-4 py-2 text-sm font-medium text-lf-muted hover:bg-lf-bg/50 hover:text-lf-text"
            >
              Close
            </button>
          </>
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
      </Modal>
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
        className="rounded-lg border border-lf-border px-3 py-1.5 text-xs font-medium text-lf-muted hover:bg-lf-bg/50 hover:text-lf-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        Transfer
      </button>
      {open && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
