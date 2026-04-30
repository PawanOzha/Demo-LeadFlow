"use client";

import { useActionState, useState } from "react";
import { updateLeadSalesOutcome } from "@/app/actions/exec";
import { SalesStage } from "@/lib/constants";
import { formatDealMoney } from "@/lib/deal-money";

const selectClass =
  "h-9 w-full max-w-[11rem] cursor-pointer appearance-none rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-lf-brand";

const textareaClass =
  "w-full min-h-[4.5rem] resize-y rounded-lg border border-lf-border bg-lf-bg px-2.5 py-2 text-xs leading-relaxed text-lf-text placeholder:text-lf-subtle outline-none ring-lf-brand/35 focus:ring-2";

export function UpdateOutcomeForm({
  leadId,
  dealCurrency,
  estimatedDealValue,
}: {
  leadId: string;
  dealCurrency: string;
  estimatedDealValue: number | string | null;
}) {
  const [outcome, setOutcome] = useState("");
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => updateLeadSalesOutcome(formData),
    undefined as { error?: string; ok?: boolean } | undefined,
  );

  const showLostNotes = outcome === SalesStage.CLOSED_LOST;
  const showWonRevenue = outcome === SalesStage.CLOSED_WON;
  const estimateHint =
    estimatedDealValue != null &&
    estimatedDealValue !== "" &&
    !Number.isNaN(Number(estimatedDealValue))
      ? formatDealMoney(estimatedDealValue, dealCurrency)
      : null;

  return (
    <form action={action} className="flex min-w-0 flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <select
        name="salesStage"
        required
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        className={selectClass}
      >
        <option value="" disabled>
          Set outcome
        </option>
        <option value={SalesStage.CLOSED_WON}>Closed — won</option>
        <option value={SalesStage.CLOSED_LOST}>Closed — lost</option>
      </select>
      {showWonRevenue ? (
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium uppercase tracking-wide text-lf-muted">
            Closed revenue <span className="text-lf-danger">*</span>{" "}
            <span className="font-normal normal-case text-lf-subtle">
              ({dealCurrency})
            </span>
          </label>
          <input
            name="closedRevenue"
            required
            inputMode="decimal"
            placeholder="e.g. 12500"
            className="h-9 w-full max-w-[11rem] rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary outline-none focus:border-transparent focus:ring-2 focus:ring-lf-brand"
          />
          {estimateHint ? (
            <p className="text-[11px] text-lf-subtle">
              Analyst estimate: {estimateHint}
            </p>
          ) : null}
        </div>
      ) : null}
      {showLostNotes ? (
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium uppercase tracking-wide text-lf-muted">
            Lost notes <span className="text-lf-danger">*</span>
          </label>
          <textarea
            name="lostNotes"
            required
            rows={3}
            placeholder="Why was this lost? (required)"
            className={textareaClass}
          />
        </div>
      ) : null}
      {state?.error ? (
        <p className="text-xs text-lf-danger">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-lf-success">Saved.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-9 w-fit rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
      >
        {pending ? "…" : "Save"}
      </button>
    </form>
  );
}
