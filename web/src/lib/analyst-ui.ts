import {
  QualificationStatus,
  SalesStage,
} from "@/lib/constants";
import { formatLeadSourceDisplay } from "@/lib/lead-sources";
import { stripQualificationReasonFromNotes } from "@/lib/qualification-reasons";

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Full source label for pills and exports (includes website / Meta detail). */
export function sourcePillText(source: string): string {
  return formatLeadSourceDisplay(source);
}

export function scoreBarColor(score: number | null): string {
  if (score == null) return "bg-lf-muted";
  if (score >= 70) return "bg-lf-success";
  if (score >= 40) return "bg-lf-warning";
  return "bg-lf-danger";
}

export type PipelinePill = {
  label: string;
  className: string;
};

export function pipelinePillForLead(q: string, stage: string): PipelinePill {
  if (q !== QualificationStatus.QUALIFIED) {
    return { label: "—", className: "bg-lf-bg/60 text-lf-subtle" };
  }
  switch (stage) {
    case SalesStage.PRE_SALES:
      return {
        label: "Pending",
        className: "bg-lf-bg/60 text-lf-text-secondary",
      };
    case SalesStage.WITH_TEAM_LEAD:
      return {
        label: "Assigned",
        className:
          "bg-lf-warning/20 text-lf-warning ring-1 ring-lf-warning/40",
      };
    case SalesStage.WITH_EXECUTIVE:
      return {
        label: "In progress",
        className:
          "bg-lf-accent/10 text-lf-accent ring-1 ring-lf-brand/35",
      };
    case SalesStage.CLOSED_WON:
      return {
        label: "Closed won",
        className:
          "bg-lf-success/20 text-lf-success ring-1 ring-lf-success/40",
      };
    case SalesStage.CLOSED_LOST:
      return {
        label: "Closed lost",
        className: "bg-lf-danger/20 text-lf-danger ring-1 ring-lf-danger/40",
      };
    default:
      return { label: stage, className: "bg-lf-bg/60 text-lf-muted" };
  }
}

/** Note text for “Qualified pipeline detail” (export + dashboards). For closed lost, shows the sales executive’s loss reason (`lostNotes`), not general lead notes. */
export function pipelineNoteForLead(
  q: string,
  stage: string,
  notes: string | null,
  lostNotes?: string | null,
): string {
  if (stage === SalesStage.CLOSED_LOST) {
    const exec = lostNotes?.trim();
    if (exec) return exec;
    return "No loss reason recorded";
  }
  const cleanNotes = stripQualificationReasonFromNotes(notes);
  if (cleanNotes?.trim()) return cleanNotes.trim();
  if (q !== QualificationStatus.QUALIFIED) return "—";
  switch (stage) {
    case SalesStage.PRE_SALES:
      return "Pending assignment";
    case SalesStage.WITH_TEAM_LEAD:
      return "Assigned to main team";
    case SalesStage.WITH_EXECUTIVE:
      return "In active discussion";
    case SalesStage.CLOSED_WON:
      return "Won";
    default:
      return "—";
  }
}

/** Coerce pg rows or RSC-serialized values to a valid Date. */
export function parseDbDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function formatAnalystDate(d: Date | string | number | null | undefined) {
  const date = parseDbDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
