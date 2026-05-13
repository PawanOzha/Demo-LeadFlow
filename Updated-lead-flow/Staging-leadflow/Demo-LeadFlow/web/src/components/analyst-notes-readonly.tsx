/** Lead analyst notes (Lead.notes) — visible to all roles that can view the lead. */
export default function AnalystNotesReadonly({
  notes,
}: {
  notes: string | null;
}) {
  if (!notes?.trim()) {
    return <span className="text-lf-subtle">—</span>;
  }
  return (
    <div
      className="max-h-36 min-w-0 w-full overflow-auto rounded-lg border border-lf-border bg-lf-bg/60 px-3.5 py-3 text-xs leading-relaxed text-lf-text-secondary"
      title={notes}
    >
      <p className="min-w-0 whitespace-pre-wrap break-words normal-case [overflow-wrap:anywhere]">
        {notes}
      </p>
    </div>
  );
}
