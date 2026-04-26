"use client";

import { useActionState } from "react";
import { updateExecLostNotes } from "@/app/actions/exec";

const textareaClass =
  "w-full min-h-[4.5rem] resize-y rounded-lg border border-lf-border bg-lf-bg px-2.5 py-2 text-xs leading-relaxed text-lf-text placeholder:text-lf-subtle outline-none ring-lf-brand/35 focus:ring-2";

export function ExecLostNotesEditor({
  leadId,
  initialNotes,
}: {
  leadId: string;
  initialNotes: string | null;
}) {
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => updateExecLostNotes(formData),
    undefined as { error?: string; ok?: boolean } | undefined,
  );

  return (
    <form action={action} className="flex min-w-[12rem] max-w-[20rem] flex-col gap-1.5">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="text-[10px] font-medium uppercase tracking-wide text-lf-subtle">
        Lost-deal notes
      </label>
      <textarea
        name="lostNotes"
        required
        defaultValue={initialNotes ?? ""}
        placeholder="Reason, competitor, timing…"
        rows={3}
        className={textareaClass}
      />
      {state?.error ? (
        <p className="text-[11px] text-lf-danger">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-[11px] text-lf-success">Saved.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-lf-accent px-2.5 py-1 text-[11px] font-semibold text-lf-on-accent hover:bg-lf-accent-hover disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update notes"}
      </button>
    </form>
  );
}
