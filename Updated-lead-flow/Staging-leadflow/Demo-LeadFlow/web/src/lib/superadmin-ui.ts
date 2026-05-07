import { LeadHandoffAction, UserRole } from "@/lib/constants";

export function superadminRoleLabel(role: string) {
  switch (role) {
    case UserRole.LEAD_ANALYST:
      return "Lead analyst";
    case UserRole.ANALYST_TEAM_LEAD:
      return "Analyst team lead";
    case UserRole.MAIN_TEAM_LEAD:
      return "Main team lead";
    case UserRole.SALES_EXECUTIVE:
      return "Sales executive";
    case UserRole.SUPERADMIN:
      return "Superadmin";
    default:
      return role;
  }
}

export const superadminHandoffLabels: Record<string, string> = {
  [LeadHandoffAction.LEAD_CREATED]: "Lead created",
  [LeadHandoffAction.ROUTED_TO_MAIN_TEAM]: "Routed to main team",
  [LeadHandoffAction.ASSIGNED_TO_EXECUTIVE]: "Assigned to sales executive",
  [LeadHandoffAction.DIRECT_ASSIGNED_TO_EXECUTIVE_BY_ATL]:
    "Directly assigned to sales executive by ATL",
  [LeadHandoffAction.CLOSED_WON]: "Closed won",
  [LeadHandoffAction.CLOSED_LOST]: "Closed lost",
};
