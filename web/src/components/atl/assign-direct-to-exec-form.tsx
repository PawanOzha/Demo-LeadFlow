"use client";

import { useActionState, useMemo, useState } from "react";
import { assignLeadDirectToExecutiveByAtl } from "@/app/actions/atl";

type MtlOption = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
};

type ExecOption = {
  id: string;
  name: string;
  email: string;
  teamId: string;
};

export function AssignDirectToExecForm({
  leadId,
  mainTeamLeads,
  execOptions,
}: {
  leadId: string;
  mainTeamLeads: MtlOption[];
  execOptions: ExecOption[];
}) {
  const [selectedMtlId, setSelectedMtlId] = useState("");
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) =>
      assignLeadDirectToExecutiveByAtl(formData),
    undefined as { error?: string; ok?: boolean } | undefined,
  );

  const selectedMtl = useMemo(
    () => mainTeamLeads.find((m) => m.id === selectedMtlId) ?? null,
    [mainTeamLeads, selectedMtlId],
  );

  const teamExecOptions = useMemo(() => {
    if (!selectedMtl) return [];
    return execOptions.filter((e) => e.teamId === selectedMtl.teamId);
  }, [execOptions, selectedMtl]);

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="leadId" value={leadId} />
      <select
        name="mainTeamLeadId"
        required
        className="rounded-md border border-lf-border bg-lf-bg px-2 py-1 text-xs text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
        value={selectedMtlId}
        onChange={(e) => setSelectedMtlId(e.target.value)}
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

      <select
        name="salesExecId"
        required
        disabled={!selectedMtl}
        className="rounded-md border border-lf-border bg-lf-bg px-2 py-1 text-xs text-lf-text outline-none ring-lf-brand/35 focus:ring-2 disabled:opacity-60"
        defaultValue=""
      >
        <option value="" disabled>
          {selectedMtl ? "Select sales executive" : "Pick team lead first"}
        </option>
        {teamExecOptions.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name} ({e.email})
          </option>
        ))}
      </select>

      {state?.error ? (
        <p className="text-xs text-lf-danger">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-lf-success">Direct assigned.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !selectedMtl}
        className="rounded bg-lf-accent px-2 py-1 text-xs text-lf-on-accent hover:bg-lf-accent-hover disabled:opacity-50"
      >
        {pending ? "…" : "Direct assign"}
      </button>
    </form>
  );
}
