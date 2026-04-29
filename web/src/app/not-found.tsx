import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-lf-bg px-4 py-12 text-lf-text">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="max-w-md text-center text-sm text-lf-muted">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-lf-link hover:underline"
      >
        Go home
      </Link>
    </div>
  );
}
