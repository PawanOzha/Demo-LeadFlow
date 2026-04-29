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
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-lf-muted">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-lf-accent px-4 py-2.5 text-sm font-semibold text-lf-on-accent hover:bg-lf-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
