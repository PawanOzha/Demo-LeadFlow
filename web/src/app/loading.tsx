export default function Loading() {
  return (
    <div className="h-full min-h-full overflow-y-auto bg-lf-bg px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <div className="h-12 w-full animate-pulse rounded-xl border border-lf-border bg-lf-surface" />
        <div className="h-40 w-full animate-pulse rounded-2xl border border-lf-border bg-lf-surface" />
        <div className="h-72 w-full animate-pulse rounded-2xl border border-lf-border bg-lf-surface" />
      </div>
    </div>
  );
}
