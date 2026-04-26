/** Read-only display of sales executive lost-deal notes (shared across analyst / ATL / MTL views). */
export default function ExecLostNotesReadonly({
  notes,
}: {
  notes: string | null;
}) {
  if (!notes?.trim()) {
    return <span className="text-lf-subtle">—</span>;
  }
  return (
    <div
      className="max-h-28 min-w-0 max-w-[280px] overflow-auto rounded-lg border border-lf-border bg-lf-bg/50 px-3.5 py-3 text-xs leading-relaxed text-lf-text-secondary"
      title={notes}
    >
      <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{notes}</p>
    </div>
  );
}
