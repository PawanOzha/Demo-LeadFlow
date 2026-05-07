export default function Loading() {
  return (
    <div className="min-h-screen bg-lf-bg px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <div className="h-12 w-full animate-pulse rounded-lg border border-lf-border bg-lf-surface" />
        <div className="h-40 w-full animate-pulse rounded-lg border border-lf-border bg-lf-surface" />
        <div className="h-72 w-full animate-pulse rounded-lg border border-lf-border bg-lf-surface" />
      </div>
    </div>
  );
}
