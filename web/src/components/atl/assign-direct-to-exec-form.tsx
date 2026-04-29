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
        className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-transparent focus:ring-2 focus:ring-gray-900"
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
        className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-transparent focus:ring-2 focus:ring-gray-900 disabled:opacity-60"
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
        className="h-9 w-fit rounded-lg bg-gray-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-gray-700 active:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-40"
      >
        {pending ? "…" : "Direct assign"}
      </button>
    </form>
  );
}
