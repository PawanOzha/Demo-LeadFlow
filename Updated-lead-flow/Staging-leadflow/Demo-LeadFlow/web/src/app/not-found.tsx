import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-lf-bg px-4 py-12 text-lf-text">
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="max-w-md text-center text-sm text-lf-text-secondary">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-10 items-center rounded-md border border-lf-border bg-lf-surface px-4 text-sm font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2"
      >
        Go to home
      </Link>
    </div>
  );
}
