"use client";

import { useActionState, useState } from "react";
import { updateLeadSalesOutcome } from "@/app/actions/exec";
import { SalesStage } from "@/lib/constants";

const selectClass =
  "w-full max-w-[11rem] rounded-lg border border-lf-border bg-lf-bg px-2 py-1.5 text-xs text-lf-text outline-none ring-lf-brand/35 focus:ring-2";

const textareaClass =
  "w-full min-h-[4.5rem] resize-y rounded-lg border border-lf-border bg-lf-bg px-2.5 py-2 text-xs leading-relaxed text-lf-text placeholder:text-lf-subtle outline-none ring-lf-brand/35 focus:ring-2";

export function UpdateOutcomeForm({ leadId }: { leadId: string }) {
  const [outcome, setOutcome] = useState("");
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => updateLeadSalesOutcome(formData),
    undefined as { error?: string; ok?: boolean } | undefined,
  );

  const showLostNotes = outcome === SalesStage.CLOSED_LOST;

  return (
    <form action={action} className="flex min-w-0 flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <select
        name="salesStage"
        required
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        className={selectClass}
      >
        <option value="" disabled>
          Set outcome
        </option>
        <option value={SalesStage.CLOSED_WON}>Closed — won</option>
        <option value={SalesStage.CLOSED_LOST}>Closed — lost</option>
      </select>
      {showLostNotes ? (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-lf-subtle">
            Lost notes <span className="text-lf-danger">*</span>
          </label>
          <textarea
            name="lostNotes"
            required
            rows={3}
            placeholder="Why was this lost? (required)"
            className={textareaClass}
          />
        </div>
      ) : null}
      {state?.error ? (
        <p className="text-xs text-lf-danger">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-lf-success">Saved.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-lf-accent px-2.5 py-1.5 text-xs font-semibold text-lf-on-accent hover:bg-lf-accent-hover disabled:opacity-50"
      >
        {pending ? "…" : "Save"}
      </button>
    </form>
  );
}
