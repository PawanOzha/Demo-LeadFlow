"use client";

import { useActionState } from "react";
import { assignLeadToExecutive } from "@/app/actions/mtl";

type ExecOption = { id: string; name: string };

const selectClass =
  "w-full max-w-[11rem] rounded-lg border border-lf-border bg-lf-bg px-2 py-1.5 text-xs text-lf-text outline-none ring-lf-brand/35 focus:ring-2";

export function AssignToExecForm({
  leadId,
  execs,
  currentExecId,
}: {
  leadId: string;
  execs: ExecOption[];
  currentExecId: string | null;
}) {
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => assignLeadToExecutive(formData),
    undefined as { error?: string; ok?: boolean } | undefined,
  );

  return (
    <form action={action} className="flex min-w-0 flex-col gap-1.5">
      <input type="hidden" name="leadId" value={leadId} />
      <select
        name="salesExecId"
        required
        className={selectClass}
        defaultValue={currentExecId ?? ""}
      >
        <option value="" disabled>
          Select rep
        </option>
        {execs.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      {state?.error ? (
        <p className="text-xs text-lf-danger">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-lf-success">Updated.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-lf-accent px-2.5 py-1.5 text-xs font-semibold text-lf-on-accent hover:bg-lf-accent-hover disabled:opacity-50"
      >
        {pending ? "…" : currentExecId ? "Reassign" : "Assign"}
      </button>
    </form>
  );
}
