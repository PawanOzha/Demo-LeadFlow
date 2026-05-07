"use client";

/**
 * Scoped error UI for Report — shows message + Next.js digest so production
 * debugging does not require “View Source” (digest is often only in server logs).
 */
export default function AnalystTeamLeadReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-12 text-lf-text">
      <h2 className="text-xl font-semibold">Report couldn&apos;t load</h2>
      <p className="text-sm text-lf-muted">
        Something failed while rendering this page. Details below help narrow
        the cause; you can also check Railway deployment logs for the same
        digest.
      </p>
      {error.digest ? (
        <p className="rounded-lg border border-lf-border bg-lf-surface px-3 py-2 font-mono text-xs text-lf-text-secondary">
          <span className="text-lf-subtle">digest:</span> {error.digest}
        </p>
      ) : null}
      <pre className="max-h-48 overflow-auto rounded-lg border border-lf-border bg-lf-bg p-3 text-xs text-lf-text-secondary whitespace-pre-wrap break-words">
        {error.message || "(no message)"}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-lf-accent px-4 py-2 text-sm font-semibold text-lf-on-accent hover:bg-lf-accent-hover"
        >
          Try again
        </button>
        <a
          href="/analyst-team-lead"
          className="rounded-lg border border-lf-border px-4 py-2 text-sm font-medium text-lf-text-secondary hover:bg-lf-bg/50"
        >
          Dashboard
        </a>
      </div>
    </div>
  );
}
