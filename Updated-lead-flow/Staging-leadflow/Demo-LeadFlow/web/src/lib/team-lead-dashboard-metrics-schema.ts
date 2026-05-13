import { z } from "zod";

/** Top-level scalar metrics on the team-lead dashboard (excluding grid rows). */
export const teamLeadDashboardMetricsSchema = z.object({
  execCount: z.number().int().nonnegative(),
});
