"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-lf-bg px-4 py-12 text-lf-text">
      {error.digest ? (
        <>
          <p className="sr-only" suppressHydrationWarning>
            {error.digest}
          </p>
          <p className="max-w-md text-center font-mono text-xs text-lf-subtle">
            Error ID: {error.digest}
          </p>
        </>
      ) : null}
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-lf-text-secondary">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-10 items-center rounded-md bg-lf-accent px-4 py-2.5 text-sm font-semibold text-lf-on-accent transition-colors hover:bg-lf-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-lf-bg"
      >
        Try again
      </button>
    </div>
  );
}
