"use client";

import { useActionState } from "react";
import { assignLeadToMainTeamLead } from "@/app/actions/atl";

type MtlOption = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
};

export function AssignToMtlForm({
  leadId,
  mainTeamLeads,
}: {
  leadId: string;
  mainTeamLeads: MtlOption[];
}) {
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) =>
      assignLeadToMainTeamLead(formData),
    undefined as { error?: string; ok?: boolean } | undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="leadId" value={leadId} />
      <select
        name="mainTeamLeadId"
        required
        className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-lf-brand"
        defaultValue=""
      >
        <option value="" disabled>
          Select team lead
        </option>
        {mainTeamLeads.map((m) => (
          <option key={m.id} value={m.id}>
            {m.teamName} — {m.name}
          </option>
        ))}
      </select>
      {state?.error ? (
        <p className="text-xs text-lf-danger">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-lf-success">Assigned.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-9 w-fit rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
      >
        {pending ? "…" : "Assign"}
      </button>
    </form>
  );
}
