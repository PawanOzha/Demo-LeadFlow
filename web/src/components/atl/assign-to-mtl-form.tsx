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
        className="rounded-md border border-lf-border bg-lf-bg px-2 py-1 text-xs text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
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
        className="rounded bg-lf-accent px-2 py-1 text-xs text-lf-on-accent hover:bg-lf-accent-hover disabled:opacity-50"
      >
        {pending ? "…" : "Assign"}
      </button>
    </form>
  );
}
