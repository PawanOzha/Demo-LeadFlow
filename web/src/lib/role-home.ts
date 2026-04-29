/** Default app path after login for each role. */
export const ROLE_HOME: Record<string, string> = {
  LEAD_ANALYST: "/analyst",
  ANALYST_TEAM_LEAD: "/analyst-team-lead",
  MAIN_TEAM_LEAD: "/team-lead",
  SALES_EXECUTIVE: "/executive",
  SUPERADMIN: "/superadmin/dashboard",
};

export function homePathForRole(role: string): string | undefined {
  return ROLE_HOME[role];
}
