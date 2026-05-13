import { TableSkeleton } from "@/components/ui/page-skeletons";

export default function AnalystTeamLeadLeadsLoading() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-lf-border px-3 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-4">
          <div className="h-10 min-w-[10rem] flex-1 animate-shimmer rounded-lg" />
          <div className="h-10 min-w-[10rem] flex-1 animate-shimmer rounded-lg" />
          <div className="h-10 min-w-[12rem] flex-1 animate-shimmer rounded-lg sm:max-w-md" />
        </div>
        <div className="h-24 w-full animate-shimmer bg-lf-bg/30" />
      </div>
      <TableSkeleton rows={10} />
    </div>
  );
}
