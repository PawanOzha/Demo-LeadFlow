export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-lf-border/80 bg-lf-surface p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="h-3 w-24 animate-shimmer rounded" />
            <div className="h-10 w-10 animate-shimmer rounded-lg" />
          </div>
          <div className="h-7 w-28 animate-shimmer rounded" />
          <div className="mt-2 h-3 w-20 animate-shimmer rounded" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-lf-border/80 bg-lf-surface">
      <div className="flex h-11 items-center gap-6 border-b border-lf-border/80 bg-lf-neutral-50 px-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-20 animate-shimmer rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex h-14 items-center gap-6 border-b border-lf-divide px-6"
        >
          {Array.from({ length: 5 }).map((__, j) => (
            <div
              key={j}
              className="h-3 w-24 animate-shimmer rounded"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-10 w-64 animate-shimmer rounded" />
        <div className="h-10 w-44 animate-shimmer rounded" />
      </div>
      <StatCardsSkeleton />
      <div className="h-80 animate-shimmer rounded-xl border border-lf-border/80" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-shimmer rounded-xl border border-lf-border/80" />
        <div className="h-64 animate-shimmer rounded-xl border border-lf-border/80" />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
