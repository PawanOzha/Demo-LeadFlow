export const UserRole = {
  LEAD_ANALYST: "LEAD_ANALYST",
  ANALYST_TEAM_LEAD: "ANALYST_TEAM_LEAD",
  MAIN_TEAM_LEAD: "MAIN_TEAM_LEAD",
  SALES_EXECUTIVE: "SALES_EXECUTIVE",
  SUPERADMIN: "SUPERADMIN",
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];

export const QualificationStatus = {
  QUALIFIED: "QUALIFIED",
  NOT_QUALIFIED: "NOT_QUALIFIED",
  IRRELEVANT: "IRRELEVANT",
} as const;

export type QualificationStatusValue =
  (typeof QualificationStatus)[keyof typeof QualificationStatus];

export const SalesStage = {
  PRE_SALES: "PRE_SALES",
  WITH_TEAM_LEAD: "WITH_TEAM_LEAD",
  WITH_EXECUTIVE: "WITH_EXECUTIVE",
  CLOSED_WON: "CLOSED_WON",
  CLOSED_LOST: "CLOSED_LOST",
} as const;

export type SalesStageValue = (typeof SalesStage)[keyof typeof SalesStage];

export const EXEC_DEADLINE_DAYS = 10;

/** Values stored on LeadHandoffLog.action */
export const LeadHandoffAction = {
  LEAD_CREATED: "LEAD_CREATED",
  ROUTED_TO_MAIN_TEAM: "ROUTED_TO_MAIN_TEAM",
  ASSIGNED_TO_EXECUTIVE: "ASSIGNED_TO_EXECUTIVE",
  DIRECT_ASSIGNED_TO_EXECUTIVE_BY_ATL:
    "DIRECT_ASSIGNED_TO_EXECUTIVE_BY_ATL",
  CLOSED_WON: "CLOSED_WON",
  CLOSED_LOST: "CLOSED_LOST",
} as const;
