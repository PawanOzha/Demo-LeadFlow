import { redirect } from "next/navigation";

/** @deprecated Use `/analyst-team-lead/reports` */
export default function AnalystTeamLeadInsightsRedirectPage() {
  redirect("/analyst-team-lead/reports");
}
