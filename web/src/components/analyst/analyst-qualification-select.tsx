"use client";

import { useEffect, useTransition, useState } from "react";
import { updateLeadQualificationAnalyst } from "@/app/actions/leads-analyst";
import { QualificationStatus } from "@/lib/constants";

const OPTIONS: { value: string; label: string }[] = [
  { value: QualificationStatus.QUALIFIED, label: "QUALIFIED" },
  { value: QualificationStatus.NOT_QUALIFIED, label: "NOT QUALIFIED" },
  { value: QualificationStatus.IRRELEVANT, label: "IRRELEVANT" },
];

export default function AnalystQualificationSelect({
  leadId,
  value,
}: {
  leadId: string;
  value: string;
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  return (
    <select
      aria-label="Qualification"
      value={selected}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        const prev = selected;
        setSelected(next);
        startTransition(async () => {
          const res = await updateLeadQualificationAnalyst(leadId, next);
          if (res && "error" in res) {
            setSelected(prev);
          }
        });
      }}
      className="w-full min-w-[9.5rem] cursor-pointer rounded-lg border border-lf-border bg-lf-bg px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-text shadow-inner shadow-black/8 outline-none transition-opacity hover:border-lf-border focus:border-lf-brand/50 focus:ring-2 focus:ring-lf-brand/25 disabled:cursor-wait disabled:opacity-60"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
