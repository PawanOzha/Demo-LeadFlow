import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_BAR: Record<string, string> = {
  cyan: "from-cyan-400 via-sky-500 to-blue-600",
  blue: "from-blue-400 via-indigo-500 to-violet-600",
  amber: "from-amber-400 via-orange-500 to-amber-700",
  slate: "from-slate-300 via-slate-400 to-slate-600",
  emerald: "from-emerald-400 via-teal-500 to-emerald-700",
  rose: "from-rose-400 via-red-500 to-rose-700",
  violet: "from-violet-400 via-purple-500 to-indigo-700",
};

export function PremiumMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "blue",
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: keyof typeof ACCENT_BAR;
  className?: string;
}) {
  const bar = ACCENT_BAR[accent] ?? ACCENT_BAR.blue;
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-lf-border/70 bg-gradient-to-b from-lf-surface via-lf-surface to-lf-bg/60 px-5 pb-5 pt-6 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.12)] transition-shadow duration-300 hover:shadow-[0_12px_40px_-10px_rgba(15,23,42,0.18)] dark:border-lf-border/50 dark:from-lf-surface dark:via-lf-surface dark:to-lf-bg/40 dark:shadow-[0_8px_32px_-6px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-95",
          bar,
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
          {label}
        </p>
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lf-bg/80 text-lf-text-secondary shadow-sm ring-1 ring-lf-border/60 dark:bg-lf-elevated/80">
            <Icon className="h-4 w-4 opacity-85" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-lf-text">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-lf-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
