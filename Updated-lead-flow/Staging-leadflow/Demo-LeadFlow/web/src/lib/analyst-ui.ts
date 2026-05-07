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
    return {
      label: "—",
      className:
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-lf-elevated text-lf-label ring-1 ring-lf-border",
    };
  }
  switch (stage) {
    case SalesStage.PRE_SALES:
      return {
        label: "Pending",
        className:
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-lf-warning/30 bg-lf-warning/15 text-lf-warning",
      };
    case SalesStage.WITH_TEAM_LEAD:
      return {
        label: "Assigned",
        className:
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-lf-brand/30 bg-lf-brand/15 text-lf-brand",
      };
    case SalesStage.WITH_EXECUTIVE:
      return {
        label: "In progress",
        className:
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-lf-brand/30 bg-lf-brand/15 text-lf-brand",
      };
    case SalesStage.CLOSED_WON:
      return {
        label: "Closed won",
        className:
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-lf-success/30 bg-lf-success/15 text-lf-success",
      };
    case SalesStage.CLOSED_LOST:
      return {
        label: "Closed lost",
        className:
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-lf-danger/30 bg-lf-danger/15 text-lf-danger",
      };
    default:
      return {
        label: stage,
        className:
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-lf-elevated text-lf-label ring-1 ring-lf-border",
      };
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
