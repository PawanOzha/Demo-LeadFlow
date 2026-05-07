/** Shown above wide lead tables so users know they can scroll horizontally. */
export function PortalLeadsTableScrollHint() {
  return (
    <p className="mb-3 flex flex-wrap items-center gap-2 text-[11px] leading-snug text-lf-muted">
      <span
        className="select-none rounded-md border border-lf-border bg-lf-elevated px-2 py-0.5 font-mono text-[10px] tracking-tighter text-lf-subtle"
        aria-hidden
      >
        ← →
      </span>
      <span>Scroll or swipe sideways to see every column.</span>
    </p>
  );
}
