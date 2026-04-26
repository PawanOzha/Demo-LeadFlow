import { dbQuery } from "@/lib/db/pool";
import { EXEC_DEADLINE_DAYS, SalesStage, UserRole } from "@/lib/constants";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

type LeadOverdue = {
  id: string;
  assignedSalesExecId: string | null;
  internalReassignCount: number;
};

type ExecRow = { id: string; name: string };

/** Reassign leads whose exec deadline passed and are still active with an executive. */
export async function sweepOverdueLeadsForTeam(teamId: string) {
  const now = new Date();
  const overdue = await dbQuery<LeadOverdue>(
    `SELECT id, "assignedSalesExecId", "internalReassignCount" FROM "Lead"
     WHERE "teamId" = $1 AND "salesStage" = $2 AND "execDeadlineAt" IS NOT NULL AND "execDeadlineAt" < $3`,
    [teamId, SalesStage.WITH_EXECUTIVE, now],
  );
  if (overdue.length === 0) return;

  const execs = await dbQuery<ExecRow>(
    `SELECT id, name FROM "User" WHERE "teamId" = $1 AND role = $2 ORDER BY name ASC`,
    [teamId, UserRole.SALES_EXECUTIVE],
  );
  if (execs.length === 0) return;

  for (const lead of overdue) {
    const currentId = lead.assignedSalesExecId;
    const others = execs.filter((e) => e.id !== currentId);
    const pool = others.length > 0 ? others : execs;
    const idx =
      lead.internalReassignCount >= 0
        ? lead.internalReassignCount % pool.length
        : 0;
    const next = pool[idx];

    await dbQuery(
      `UPDATE "Lead" SET
        "assignedSalesExecId" = $1,
        "execAssignedAt" = $2,
        "execDeadlineAt" = $3,
        "internalReassignCount" = "internalReassignCount" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [next.id, now, addDays(now, EXEC_DEADLINE_DAYS), lead.id],
    );
  }
}

export async function sweepOverdueLeadsGlobal() {
  const teams = await dbQuery<{ id: string }>(
    `SELECT id FROM "Team"`,
  );
  for (const t of teams) {
    await sweepOverdueLeadsForTeam(t.id);
  }
}
