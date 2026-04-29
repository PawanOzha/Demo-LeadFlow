"use client";

import { useActionState } from "react";
import { assignLeadToExecutive } from "@/app/actions/mtl";

type ExecOption = { id: string; name: string };

const selectClass =
  "h-9 w-full max-w-[11rem] cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-transparent focus:ring-2 focus:ring-gray-900";

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
        className="h-9 w-fit rounded-lg bg-gray-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-gray-700 active:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-40"
      >
        {pending ? "…" : currentExecId ? "Reassign" : "Assign"}
      </button>
    </form>
  );
}
