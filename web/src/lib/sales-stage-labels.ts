import { SalesStage } from "@/lib/constants";

/** Labels safe for lead analysts (no executive names). */
export function analystFacingSalesLabel(stage: string) {
  switch (stage) {
    case SalesStage.PRE_SALES:
      return "Internal / routing";
    case SalesStage.WITH_TEAM_LEAD:
      return "With main team (not yet with rep)";
    case SalesStage.WITH_EXECUTIVE:
      return "With sales team";
    case SalesStage.CLOSED_WON:
      return "Closed — won";
    case SalesStage.CLOSED_LOST:
      return "Closed — lost";
    default:
      return stage;
  }
}
