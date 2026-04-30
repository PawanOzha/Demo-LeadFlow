"use client";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

/** Controlled search field (parent runs live filter + debounced URL sync). */
export function PortalLeadSearchLiveField({ value, onChange }: Props) {
  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
      role="search"
    >
      <label htmlFor="portal-lead-q-live" className="sr-only">
        Search by client name or phone number
      </label>
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lf-muted">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
        </span>
        <input
          id="portal-lead-q-live"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by name or phone…"
          autoComplete="off"
          enterKeyHint="search"
          className="h-9 w-64 rounded-lg border border-lf-border bg-lf-bg/80 pl-9 pr-4 text-[13px] text-lf-text placeholder:text-lf-muted outline-none transition-all focus:border-transparent focus:bg-lf-surface focus:ring-2 focus:ring-lf-brand"
        />
      </div>
      {value.trim() ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="h-9 shrink-0 rounded-lg px-3 text-[13px] font-medium text-lf-label transition-colors hover:bg-lf-row-hover hover:text-lf-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand focus-visible:ring-offset-2"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
