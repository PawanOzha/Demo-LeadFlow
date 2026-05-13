import { TableSkeleton } from "@/components/ui/page-skeletons";

export default function AnalystLeadsImportLoading() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="h-40 animate-shimmer rounded-2xl border border-lf-border bg-lf-surface" />
      <TableSkeleton rows={6} />
    </div>
  );
}
