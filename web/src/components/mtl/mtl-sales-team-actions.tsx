"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import AddExecForm from "@/components/mtl/add-exec-form";

function Modal({
  children,
  onClose,
}: {
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
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[8vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mtl-add-exec-heading"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-lf-border bg-lf-surface p-6 pt-8 shadow-2xl sm:p-8 sm:pt-10"
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
        {children}
      </div>
    </div>
  );
}

export function MtlSalesTeamActions({
  teamName,
}: {
  teamName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const onCreated = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      <div className="relative z-10 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          className="h-9 rounded-lg bg-gray-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-gray-700 active:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          Add sales executive
        </button>
      </div>

      {open
        ? createPortal(
            <Modal onClose={() => setOpen(false)}>
              <AddExecForm
                variant="modal"
                teamName={teamName}
                onCreated={onCreated}
              />
            </Modal>,
            document.body,
          )
        : null}
    </>
  );
}
