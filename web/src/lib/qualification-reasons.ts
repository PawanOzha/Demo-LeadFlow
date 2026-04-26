import { QualificationStatus } from "@/lib/constants";

export const NOT_QUALIFIED_REASONS = [
  "Documents Pending",
  "No Reply",
] as const;

export const IRRELEVANT_REASONS = [
  "Looking for Jobs",
  "Not Eligible",
  "Not Interested",
] as const;

export const QUALIFICATION_REASON_BY_STATUS = {
  [QualificationStatus.NOT_QUALIFIED]: NOT_QUALIFIED_REASONS,
  [QualificationStatus.IRRELEVANT]: IRRELEVANT_REASONS,
} as const;

const NOTES_PREFIX = "Qualification reason:";

export function isAllowedQualificationReason(
  status: string,
  reason: string | null | undefined,
): boolean {
  const value = reason?.trim();
  if (!value) return status === QualificationStatus.QUALIFIED;
  const allowed: readonly string[] =
    status === QualificationStatus.NOT_QUALIFIED
      ? NOT_QUALIFIED_REASONS
      : status === QualificationStatus.IRRELEVANT
        ? IRRELEVANT_REASONS
        : [];
  return allowed.includes(value);
}

export function joinNotesWithQualificationReason(
  reason: string | null,
  notes: string | null,
): string | null {
  const reasonClean = reason?.trim() ?? "";
  const notesClean = notes?.trim() ?? "";
  if (!reasonClean && !notesClean) return null;
  if (!reasonClean) return notesClean || null;
  if (!notesClean) return `${NOTES_PREFIX} ${reasonClean}`;
  return `${NOTES_PREFIX} ${reasonClean}\n${notesClean}`;
}

export function extractQualificationReason(notes: string | null): string | null {
  const raw = notes?.trim();
  if (!raw) return null;
  const [firstLine] = raw.split("\n");
  if (!firstLine.startsWith(NOTES_PREFIX)) return null;
  const reason = firstLine.slice(NOTES_PREFIX.length).trim();
  return reason || null;
}

export function stripQualificationReasonFromNotes(
  notes: string | null,
): string | null {
  const raw = notes?.trim();
  if (!raw) return null;
  const lines = raw.split("\n");
  if (!lines[0].startsWith(NOTES_PREFIX)) return raw;
  const rest = lines.slice(1).join("\n").trim();
  return rest || null;
}
