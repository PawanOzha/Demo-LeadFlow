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
import { useRouter } from "next/navigation";
import { createLeadAnalyst } from "@/app/actions/leads-analyst";
import { QualificationStatus } from "@/lib/constants";
import { AnalystPhoneField } from "@/components/analyst/analyst-phone-field";
import {
  LEAD_SOURCE_OPTIONS,
  LEAD_WEBSITE_PRESETS,
  leadSourceUsesMetaDetail,
  leadSourceUsesWebsiteDetail,
} from "@/lib/lead-sources";
import { countryNameFromPhone } from "@/lib/phone-location";
import { QUALIFICATION_REASON_BY_STATUS } from "@/lib/qualification-reasons";
import { DEAL_CURRENCY_OPTIONS } from "@/lib/deal-money";

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
    <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-lf-text-secondary">
      {children}
      {req ? (
        <span className="text-lf-danger" aria-hidden>
          *
        </span>
      ) : null}
    </span>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-lf-border bg-lf-bg/40 p-5 shadow-sm shadow-black/[0.04]">
      <div className="mb-4 border-b border-lf-border/70 pb-3">
        <h3 className="text-sm font-semibold tracking-tight text-lf-text">
          {title}
        </h3>
        {description ? (
          <p className="mt-1.5 text-xs leading-relaxed text-lf-muted">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary placeholder:text-lf-muted outline-none transition-shadow focus:border-transparent focus:ring-2 focus:ring-lf-brand/25";

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
  /** Preset slug, "__other__", or "" before choose. */
  const [portalWebsite, setPortalWebsite] = useState("");
  const [portalWebsiteOther, setPortalWebsiteOther] = useState("");

  const needsWebsite = leadSourceUsesWebsiteDetail(leadSource);
  const needsMeta = leadSourceUsesMetaDetail(leadSource);

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
      <div className="relative z-10 flex max-h-[90vh] min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-lf-border bg-lf-surface shadow-xl shadow-black/20">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-lf-border bg-lf-surface px-6 py-5 sm:px-8 sm:py-5">
          <div className="min-w-0 flex-1 pr-2">
            <h2
              id="add-lead-title"
              className="text-lg font-semibold tracking-tight text-lf-text"
            >
              Add new lead
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-lf-muted">
              Required fields show an asterisk
              <span className="text-lf-danger">*</span>. You can update
              qualification and other details later from the lead list.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lf-muted transition-colors hover:bg-lf-row-hover hover:text-lf-text"
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
        </header>

        <form action={action} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <input type="hidden" name="qualificationStatus" value={qual} />
          <input type="hidden" name="sourceOther" value="" />

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-y-contain px-6 py-6 sm:px-8 sm:py-8">
            <FormSection
              title="Portal website"
              description="Choose your site from the list, or Other if it is not listed. Custom names are optional and only apply when you pick Other."
            >
              <div className="flex max-w-xl flex-col gap-4">
                <label className="flex flex-col">
                  <FieldLabel required>Website</FieldLabel>
                  <select
                    name="portalWebsite"
                    required
                    value={portalWebsite}
                    onChange={(e) => {
                      setPortalWebsite(e.target.value);
                      if (e.target.value !== "__other__") setPortalWebsiteOther("");
                    }}
                    className={`${inputClass} cursor-pointer appearance-none`}
                  >
                    <option value="" disabled>
                      Choose a website…
                    </option>
                    {LEAD_WEBSITE_PRESETS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                    <option value="__other__">Other — not in list</option>
                  </select>
                </label>
                {portalWebsite === "__other__" ? (
                  <label className="flex flex-col">
                    <FieldLabel>Other site or brand name</FieldLabel>
                    <input
                      name="portalWebsiteOther"
                      value={portalWebsiteOther}
                      onChange={(e) => setPortalWebsiteOther(e.target.value)}
                      autoComplete="off"
                      placeholder="Only if the lead is for a site outside the list above"
                      className={inputClass}
                    />
                    <span className="mt-1.5 text-[11px] leading-snug text-lf-subtle">
                      Optional. Leave blank if you only needed to mark &quot;Other&quot;
                      without a specific name.
                    </span>
                  </label>
                ) : (
                  <input type="hidden" name="portalWebsiteOther" value="" />
                )}
              </div>
            </FormSection>

            <FormSection
              title="Source"
              description="How this lead reached you. For website-type sources, channel detail uses your Portal website choice above. Meta sources can add a profile below."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col sm:col-span-2">
                  <FieldLabel required>Lead source</FieldLabel>
                  <select
                    name="leadSource"
                    required
                    value={leadSource}
                    onChange={(e) => {
                      setLeadSource(e.target.value);
                    }}
                    className={`${inputClass} cursor-pointer appearance-none`}
                  >
                    {LEAD_SOURCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                {needsWebsite ? (
                  <p className="sm:col-span-2 text-[12px] leading-relaxed text-lf-muted">
                    Website / brand for this lead is taken from{" "}
                    <strong className="text-lf-text-secondary">Portal website</strong>{" "}
                    (preset or &quot;Other&quot; name). Use{" "}
                    <strong className="text-lf-text-secondary">source detail</strong>{" "}
                    in Excel as <span className="font-mono text-lf-text">source_other</span>{" "}
                    when you need extra text for the source line.
                  </p>
                ) : null}

                {needsMeta ? (
                  <label className="flex flex-col sm:col-span-2">
                    <FieldLabel>Facebook profile / page</FieldLabel>
                    <input
                      name="sourceMetaProfileName"
                      autoComplete="off"
                      placeholder="e.g. Page name or profile / username"
                      className={inputClass}
                    />
                    <span className="mt-1.5 text-[11px] text-lf-subtle">
                      Optional — which Meta profile or page generated this lead.
                    </span>
                  </label>
                ) : (
                  <input type="hidden" name="sourceMetaProfileName" value="" />
                )}
              </div>
            </FormSection>

            <FormSection
              title="Contact"
              description="Name and phone are required. Country is inferred from the phone number."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col">
                  <FieldLabel required>Full name</FieldLabel>
                  <input
                    name="leadName"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col">
                  <FieldLabel>Email</FieldLabel>
                  <input
                    name="leadEmail"
                    type="email"
                    placeholder="email@company.com"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col sm:col-span-2">
                  <FieldLabel required>Phone</FieldLabel>
                  <AnalystPhoneField value={phone} onChange={setPhone} />
                </label>
                <div className="flex flex-col sm:col-span-2">
                  <FieldLabel>Country</FieldLabel>
                  <div
                    className="flex min-h-10 items-center rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary"
                    aria-live="polite"
                  >
                    {countryLabel ?? "—"}
                  </div>
                  <span className="mt-1.5 text-[11px] text-lf-subtle">
                    From the number’s country code. Used in reports.
                  </span>
                </div>
                <label className="flex flex-col sm:col-span-2">
                  <FieldLabel>City</FieldLabel>
                  <input
                    name="city"
                    placeholder="e.g. Mumbai"
                    className={inputClass}
                  />
                  <span className="mt-1.5 text-[11px] text-lf-subtle">
                    Optional. Shown in analytics and exports only.
                  </span>
                </label>
              </div>
            </FormSection>

          <FormSection title="Qualification">
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
                    className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand focus-visible:ring-offset-2 ${
                      active
                        ? "border-lf-brand/30 bg-lf-brand/15 text-lf-brand"
                        : "border-lf-border bg-lf-surface text-lf-label hover:bg-lf-row-hover hover:text-lf-text"
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
                  className={`${inputClass} cursor-pointer appearance-none`}
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
          </FormSection>

          <FormSection
            title="Lead score"
            description="Optional signal for routing and reporting (0–100)."
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-medium text-lf-text-secondary">
                Score
              </span>
              <span className="text-base font-semibold tabular-nums text-lf-text">
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
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-lf-bg accent-lf-accent"
            />
          </FormSection>

          <FormSection
            title="Deal value"
            description="Optional pipeline estimate. Final revenue is set when the deal is won."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col">
                <FieldLabel>Estimated amount</FieldLabel>
                <input
                  name="estimatedDealValue"
                  inputMode="decimal"
                  placeholder="e.g. 15000"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <FieldLabel>Currency</FieldLabel>
                <select
                  name="dealCurrency"
                  defaultValue="USD"
                  className={`${inputClass} cursor-pointer appearance-none`}
                >
                  {DEAL_CURRENCY_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </FormSection>

          <FormSection title="Notes and date">
            <div className="grid gap-5">
              <label className="flex flex-col">
                <FieldLabel>Date added</FieldLabel>
                <input
                  type="text"
                  name="leadAddedDate"
                  inputMode="numeric"
                  placeholder="YYYY/MM/DD"
                  className={`${inputClass} [color-scheme:light]`}
                />
                <span className="mt-1.5 text-[11px] text-lf-subtle">
                  Optional backfill. Use Year/Month/Day, e.g. 2026/04/06.
                </span>
              </label>
              <label className="flex flex-col">
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Context, follow-ups, internal detail…"
                  className="mt-0 rounded-lg border border-lf-border bg-lf-surface px-3 py-2.5 text-[13px] text-lf-text-secondary placeholder:text-lf-muted outline-none transition-shadow focus:border-transparent focus:ring-2 focus:ring-lf-brand/25"
                />
              </label>
            </div>
          </FormSection>

          {state?.error ? (
            <p className="text-sm text-lf-danger" role="alert">
              {state.error}
            </p>
          ) : null}
          </div>

          <div className="shrink-0 border-t border-lf-border bg-lf-surface/95 px-6 py-4 backdrop-blur-sm sm:px-8">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-lf-border bg-lf-surface px-5 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand/25 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="h-10 rounded-lg bg-lf-accent px-5 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand/25 focus:ring-offset-2 disabled:opacity-40"
              >
                {pending ? "Saving…" : "Save lead"}
              </button>
            </div>
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
  const router = useRouter();
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
    router.refresh();
  }, [router]);

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
      className="h-9 w-full rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 sm:w-auto"
    >
      + Add lead
    </button>
  );
}
