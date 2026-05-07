/**
 * Phase 1 design-system class contracts.
 * Use these constants when building shared UI primitives and page-level controls.
 */
export const dsButton = {
  base:
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium outline-none transition-[background-color,color,opacity,transform,box-shadow] duration-[var(--motion-normal)] ease-[var(--ease-apple)] focus-visible:ring-2 focus-visible:ring-lf-brand/20 focus-visible:ring-offset-2 focus-visible:ring-offset-lf-header disabled:cursor-not-allowed disabled:opacity-40",
  sizes: {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
  },
  variants: {
    primary: "bg-lf-brand text-lf-on-accent hover:bg-lf-accent-hover active:scale-[0.98]",
    secondary: "border border-lf-border bg-lf-surface text-lf-text hover:bg-lf-row-hover active:scale-[0.98]",
    ghost: "text-lf-text-secondary hover:bg-lf-row-hover hover:text-lf-text active:scale-[0.98]",
    destructive: "text-lf-text-secondary hover:bg-lf-danger-bg hover:text-lf-danger-text active:scale-[0.98]",
    link: "h-auto px-0 text-lf-link hover:text-lf-accent-hover",
  },
} as const;

export const dsInput =
  "h-10 w-full rounded-md border border-lf-border bg-lf-surface px-3 text-sm text-lf-text placeholder:text-lf-neutral-400 outline-none transition-[border-color,box-shadow] duration-[var(--motion-normal)] ease-[var(--ease-apple)] focus:border-lf-brand focus:ring-2 focus:ring-lf-brand/10";

export const dsInputError = "border-lf-danger focus:border-lf-danger focus:ring-lf-danger/10";
export const dsLabel = "mb-1.5 block text-sm font-medium text-lf-neutral-700";
export const dsHelperText = "mt-1.5 text-xs text-lf-neutral-500";
export const dsErrorText = "mt-1.5 text-xs text-lf-danger-text";

export const dsCard =
  "rounded-xl border border-lf-border/80 bg-lf-surface p-6 shadow-[var(--shadow-lf-sm)]";
export const dsCardCompact = "rounded-xl border border-lf-border/80 bg-lf-surface p-5";
export const dsCardInteractive =
  "cursor-pointer rounded-xl border border-lf-border/80 bg-lf-surface p-6 transition-all duration-[var(--motion-normal)] ease-[var(--ease-apple)] hover:border-lf-neutral-300 hover:shadow-[var(--shadow-lf-md)]";

export const dsTableWrap = "overflow-hidden rounded-xl border border-lf-border/80 bg-lf-surface";
export const dsTableHeader = "h-11 bg-lf-neutral-50 text-xs font-medium uppercase tracking-wider text-lf-neutral-500";
export const dsTableRow = "h-14 border-b border-lf-divide bg-lf-surface text-sm text-lf-text-secondary hover:bg-lf-row-hover/60";

export const dsBadge = {
  base: "inline-flex items-center rounded-full border font-medium",
  sizes: {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
  },
  variants: {
    success: "border-lf-success-border bg-lf-success-bg text-lf-success-text",
    warning: "border-lf-warning-border bg-lf-warning-bg text-lf-warning-text",
    danger: "border-lf-danger-border bg-lf-danger-bg text-lf-danger-text",
    info: "border-lf-info-border bg-lf-info-bg text-lf-info-text",
    neutral: "border-lf-neutral-200 bg-lf-neutral-100 text-lf-neutral-600",
  },
} as const;

export const dsModalBackdrop = "bg-black/40 backdrop-blur-sm";
export const dsModalPanel =
  "rounded-2xl border border-lf-border/50 bg-lf-surface shadow-[var(--shadow-lf-lg)]";
export const dsModalEnter = "data-[state=open]:duration-200 data-[state=open]:ease-[var(--ease-apple)]";
