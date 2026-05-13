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
  compact = false,
}: {
  leadId: string;
  mainTeamLeads: MtlOption[];
  execOptions: ExecOption[];
  compact?: boolean;
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

  const h = compact ? "h-8" : "h-9";
  const gap = compact ? "gap-1.5" : "gap-1";
  const selCls = `${h} w-full cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-lf-brand`;
  const btnCls = compact
    ? "h-8 w-full rounded-lg bg-lf-accent px-3 text-[12px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
    : "h-9 w-fit rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40";

  return (
    <form action={action} className={`flex w-full flex-col ${gap}`}>
      <input type="hidden" name="leadId" value={leadId} />
      <select
        name="mainTeamLeadId"
        required
        className={selCls}
        value={selectedMtlId}
        onChange={(e) => setSelectedMtlId(e.target.value)}
      >
        <option value="" disabled>
          Select team lead
        </option>
        {mainTeamLeads.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <select
        name="salesExecId"
        required
        disabled={!selectedMtl}
        className={`${selCls} disabled:opacity-60`}
        defaultValue=""
      >
        <option value="" disabled>
          {selectedMtl ? "Select sales executive" : "Pick team lead first"}
        </option>
        {teamExecOptions.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
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
        className={btnCls}
      >
        {pending ? "…" : "Direct assign"}
      </button>
    </form>
  );
}
