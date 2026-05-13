"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { updateLeadQualificationAtl } from "@/app/actions/atl";
import { QualificationStatus } from "@/lib/constants";

const OPTIONS: { value: string; label: string }[] = [
  { value: QualificationStatus.QUALIFIED, label: "Qualified" },
  { value: QualificationStatus.NOT_QUALIFIED, label: "Not qualified" },
  { value: QualificationStatus.IRRELEVANT, label: "Irrelevant" },
];

function AtlQualificationSelectInner({
  leadId,
  value,
}: {
  leadId: string;
  value: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(value);

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
          const res = await updateLeadQualificationAtl(leadId, next);
          if (res && "error" in res) {
            setSelected(prev);
            return;
          }
          router.refresh();
        });
      }}
      className="h-8 w-full min-w-[9rem] cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-2.5 text-[12px] text-lf-text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-lf-brand disabled:cursor-wait disabled:opacity-60"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function AtlQualificationSelect(props: { leadId: string; value: string }) {
  return <AtlQualificationSelectInner key={props.value} {...props} />;
}
