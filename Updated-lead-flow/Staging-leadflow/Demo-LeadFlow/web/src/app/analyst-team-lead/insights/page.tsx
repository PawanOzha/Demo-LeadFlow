import { redirect } from "next/navigation";

/** @deprecated Prefer `/analyst-team-lead` or `/analyst-team-lead/qualified-pipeline` */
export default function AnalystTeamLeadInsightsRedirectPage() {
  redirect("/analyst-team-lead/qualified-pipeline");
}
