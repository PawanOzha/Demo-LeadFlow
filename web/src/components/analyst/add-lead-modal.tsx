"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { createLeadAnalyst } from "@/app/actions/leads-analyst";
import { QualificationStatus } from "@/lib/constants";
import { AnalystPhoneField } from "@/components/analyst/analyst-phone-field";
import { LEAD_SOURCE_OPTIONS } from "@/lib/lead-sources";
import { countryNameFromPhone } from "@/lib/phone-location";
import { QUALIFICATION_REASON_BY_STATUS } from "@/lib/qualification-reasons";

export const ANALYST_OPEN_ADD_LEAD_EVENT = "leadflow:analyst-open-add-lead";

const AnalystAddLeadModalContext = createContext<(() => void) | null>(null);

export function useAnalystAddLeadModalTrigger() {
  const open = useContext(AnalystAddLeadModalContext);
  return useCallback(() => {
    if (open) open();
    else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ANALYST_OPEN_ADD_LEAD_EVENT));
    }
  }, [open]);
}

export function requestAnalystAddLeadModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ANALYST_OPEN_ADD_LEAD_EVENT));
  }
}

function FieldLabel({
  children,
  required: req,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1 flex items-center gap-1 text-xs font-medium text-lf-muted">
      {children}
      {req ? <span className="text-lf-danger">*</span> : null}
    </span>
  );
}

function AddLeadModalInner({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [qual, setQual] = useState<string>(QualificationStatus.QUALIFIED);
  const [score, setScore] = useState(30);
  const [leadSource, setLeadSource] = useState<string>(
    LEAD_SOURCE_OPTIONS[0].value,
  );
  const [phone, setPhone] = useState<string | undefined>();
  const [qualificationReason, setQualificationReason] = useState("");

  const countryLabel = useMemo(
    () => countryNameFromPhone(phone) ?? null,
    [phone],
  );

  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => createLeadAnalyst(formData),
    undefined as { error?: string; ok?: boolean } | undefined,
  );

  useEffect(() => {
    if (state?.ok) onSuccess();
  }, [state?.ok, onSuccess]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-lead-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close overlay"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-lf-border bg-lf-surface shadow-2xl shadow-black/15">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-lf-border bg-lf-surface/95 px-6 py-4 backdrop-blur-md">
          <div>
            <h2
              id="add-lead-title"
              className="text-lg font-semibold text-lf-text"
            >
              Add new lead
            </h2>
            <p className="mt-1 text-xs text-lf-subtle">
              Required fields are marked. You can refine qualification later.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-lf-muted hover:bg-lf-bg/50 hover:text-lf-text"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form action={action} className="space-y-8 px-6 py-6">
          <input type="hidden" name="qualificationStatus" value={qual} />

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-lf-subtle">
              Contact
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col">
                <FieldLabel required>Full Name</FieldLabel>
                <input
                  name="leadName"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  className="rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text placeholder:text-lf-subtle outline-none ring-lf-brand/35 focus:ring-2"
                />
              </label>
              <label className="flex flex-col sm:col-span-2">
                <FieldLabel required>Phone</FieldLabel>
                <AnalystPhoneField value={phone} onChange={setPhone} />
              </label>
              <div className="flex flex-col sm:col-span-2">
                <FieldLabel>Country</FieldLabel>
                <div
                  className="min-h-11 rounded-lg border border-lf-border bg-lf-bg/90 px-3 py-2.5 text-sm text-lf-text-secondary"
                  aria-live="polite"
                >
                  {countryLabel ?? "—"}
                </div>
                <span className="mt-1 text-[11px] text-lf-subtle">
                  Set from the phone number (country code). Saved on the lead for
                  reports.
                </span>
              </div>
              <label className="flex flex-col sm:col-span-2">
                <FieldLabel>City (optional)</FieldLabel>
                <input
                  name="city"
                  placeholder="e.g. Mumbai"
                  className="rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text placeholder:text-lf-subtle outline-none ring-lf-brand/35 focus:ring-2"
                />
                <span className="mt-1 text-[11px] text-lf-subtle">
                  Shown in analytics and exports only — not on the lead list.
                </span>
              </label>
              <label className="flex flex-col">
                <FieldLabel>Email</FieldLabel>
                <input
                  name="leadEmail"
                  type="email"
                  placeholder="email@company.com"
                  className="rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text placeholder:text-lf-subtle outline-none ring-lf-brand/35 focus:ring-2"
                />
              </label>
              <label className="flex flex-col">
                <FieldLabel required>Lead Source</FieldLabel>
                <select
                  name="leadSource"
                  required
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                  className="rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
                >
                  {LEAD_SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {leadSource === "WEBSITE_WHATSAPP" ||
            leadSource === "WEBSITE_LEAD_FORMS" ? (
              <label className="mt-4 flex flex-col">
                <FieldLabel>Website name</FieldLabel>
                <input
                  name="sourceWebsiteName"
                  autoComplete="off"
                  placeholder="e.g. company.com or landing page"
                  className="rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text placeholder:text-lf-subtle outline-none ring-lf-brand/35 focus:ring-2"
                />
                <span className="mt-1 text-[11px] text-lf-subtle">
                  Optional. Shown on reports and lead lists for website sources.
                </span>
              </label>
            ) : (
              <input type="hidden" name="sourceWebsiteName" value="" />
            )}

            {leadSource === "META_WHATSAPP" ||
            leadSource === "META_MESSENGER" ||
            leadSource === "META_LEAD_FORMS" ? (
              <label className="mt-4 flex flex-col">
                <FieldLabel>Facebook profile name</FieldLabel>
                <input
                  name="sourceMetaProfileName"
                  autoComplete="off"
                  placeholder="e.g. Page name or profile /username"
                  className="rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text placeholder:text-lf-subtle outline-none ring-lf-brand/35 focus:ring-2"
                />
                <span className="mt-1 text-[11px] text-lf-subtle">
                  Optional. Which Meta / Facebook profile or page generated this
                  lead.
                </span>
              </label>
            ) : (
              <input type="hidden" name="sourceMetaProfileName" value="" />
            )}
            <input type="hidden" name="sourceOther" value="" />
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-lf-subtle">
              Qualification
            </p>
            <FieldLabel required>Status</FieldLabel>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    v: QualificationStatus.QUALIFIED,
                    label: "Qualified",
                  },
                  {
                    v: QualificationStatus.NOT_QUALIFIED,
                    label: "Not Qualified",
                  },
                  {
                    v: QualificationStatus.IRRELEVANT,
                    label: "Irrelevant",
                  },
                ] as const
              ).map(({ v, label }) => {
                const active = qual === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setQual(v);
                      setQualificationReason("");
                    }}
                    className={`flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/50 ${
                      active
                        ? "border-lf-success/80 bg-lf-success/10 text-lf-success"
                        : "border-lf-border bg-lf-bg text-lf-subtle hover:border-lf-border hover:text-lf-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {qual === QualificationStatus.NOT_QUALIFIED ||
            qual === QualificationStatus.IRRELEVANT ? (
              <label className="mt-4 flex flex-col">
                <FieldLabel required>Reason</FieldLabel>
                <select
                  name="qualificationReason"
                  required
                  value={qualificationReason}
                  onChange={(e) => setQualificationReason(e.target.value)}
                  className="rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
                >
                  <option value="">Select reason</option>
                  {QUALIFICATION_REASON_BY_STATUS[qual].map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <input type="hidden" name="qualificationReason" value="" />
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <FieldLabel>Lead Score (0–100)</FieldLabel>
              <span className="text-sm font-semibold tabular-nums text-lf-text">
                {score}
              </span>
            </div>
            <input
              type="range"
              name="leadScore"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-lf-bg accent-lf-accent"
            />
          </div>

          <label className="mt-6 flex flex-col">
            <FieldLabel>Date added (optional)</FieldLabel>
            <input
              type="text"
              name="leadAddedDate"
              inputMode="numeric"
              placeholder="YYYY/MM/DD"
              className="rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text outline-none ring-lf-brand/35 focus:ring-2 [color-scheme:light]"
            />
            <span className="mt-1 text-[11px] text-lf-subtle">
              Use Year/Month/Day format, e.g. 2026/04/06.
            </span>
          </label>

          <label className="mt-6 flex flex-col">
            <FieldLabel>Notes</FieldLabel>
            <textarea
              name="notes"
              rows={4}
              placeholder="Context, source details, follow-ups…"
              className="mt-1 rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-sm text-lf-text placeholder:text-lf-subtle outline-none ring-lf-brand/35 focus:ring-2"
            />
          </label>

          {state?.error ? (
            <p className="mt-4 text-sm text-lf-danger" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-lf-border pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-lf-border px-5 py-2.5 text-sm font-medium text-lf-text-secondary transition hover:bg-lf-bg/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-lf-accent px-6 py-2.5 text-sm font-semibold text-lf-on-accent shadow-lg shadow-[#c62828]/30 transition hover:bg-lf-accent-deep disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AnalystAddLeadProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const openModal = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(ANALYST_OPEN_ADD_LEAD_EVENT, onOpen);
    return () => window.removeEventListener(ANALYST_OPEN_ADD_LEAD_EVENT, onOpen);
  }, []);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    setModalKey((k) => k + 1);
  }, []);

  const modal =
    open && typeof document !== "undefined" ? (
      <AddLeadModalInner
        key={modalKey}
        onSuccess={handleSuccess}
        onClose={() => setOpen(false)}
      />
    ) : null;

  return (
    <AnalystAddLeadModalContext.Provider value={openModal}>
      {children}
      {modal ? createPortal(modal, document.body) : null}
    </AnalystAddLeadModalContext.Provider>
  );
}

export function AnalystHeaderAddButton() {
  const trigger = useAnalystAddLeadModalTrigger();
  return (
    <button
      type="button"
      onClick={trigger}
      className="w-full rounded-xl bg-lf-accent px-5 py-3 text-sm font-semibold text-lf-on-accent shadow-lg shadow-[#c62828]/30 transition hover:bg-lf-accent-deep sm:w-auto"
    >
      + Add lead
    </button>
  );
}
