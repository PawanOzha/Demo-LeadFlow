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
    queueMicrotask(() => {
      setSelected(value);
    });
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
      className="h-9 w-full min-w-[9.5rem] cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-lf-brand disabled:cursor-wait disabled:opacity-60"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
