"use server";

import { revalidatePath } from "next/cache";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { getSession } from "@/lib/auth/session";
import { LeadHandoffAction, SalesStage, UserRole } from "@/lib/constants";
import { logLeadHandoff } from "@/lib/lead-handoff-log";

export async function updateLeadSalesOutcome(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.SALES_EXECUTIVE) {
    return { error: "Unauthorized." };
  }

  const leadId = String(formData.get("leadId") ?? "");
  const salesStage = String(formData.get("salesStage") ?? "");
  const lostNotesRaw = String(formData.get("lostNotes") ?? "").trim();

  if (!leadId) return { error: "Lead is required." };
  if (salesStage !== SalesStage.CLOSED_WON && salesStage !== SalesStage.CLOSED_LOST) {
    return { error: "Invalid status." };
  }

  const lead = await dbQueryOne<{ assignedSalesExecId: string | null }>(
    `SELECT "assignedSalesExecId" FROM "Lead" WHERE id = $1`,
    [leadId],
  );
  if (!lead) return { error: "Lead not found." };
  if (lead.assignedSalesExecId !== session.id) {
    return { error: "This lead is not assigned to you." };
  }

  if (salesStage === SalesStage.CLOSED_LOST && !lostNotesRaw) {
    return {
      error: "Add notes for why this opportunity was lost before saving.",
    };
  }

  const now = new Date();
  await dbQuery(
    `UPDATE "Lead" SET
      "salesStage" = $1,
      "closedAt" = $2,
      "execDeadlineAt" = NULL,
      "lostNotes" = $3,
      "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [
      salesStage,
      now,
      salesStage === SalesStage.CLOSED_LOST ? lostNotesRaw : null,
      leadId,
    ],
  );

  await logLeadHandoff({
    leadId,
    action:
      salesStage === SalesStage.CLOSED_WON
        ? LeadHandoffAction.CLOSED_WON
        : LeadHandoffAction.CLOSED_LOST,
    actorId: session.id,
    detail:
      salesStage === SalesStage.CLOSED_LOST
        ? `Lost · ${lostNotesRaw.slice(0, 200)}`
        : "Won",
  });

  revalidatePath("/executive");
  revalidatePath("/executive/leads");
  revalidatePath("/team-lead");
  revalidatePath("/team-lead/leads");
  revalidatePath("/team-lead/reports");
  revalidatePath("/analyst-team-lead");
  revalidatePath("/analyst");
  return { ok: true as const };
}

export async function updateExecLostNotes(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.SALES_EXECUTIVE) {
    return { error: "Unauthorized." };
  }

  const leadId = String(formData.get("leadId") ?? "");
  const lostNotes = String(formData.get("lostNotes") ?? "").trim();
  if (!leadId) return { error: "Lead is required." };
  if (!lostNotes) {
    return { error: "Notes cannot be empty." };
  }

  const lead = await dbQueryOne<{
    assignedSalesExecId: string | null;
    salesStage: string;
  }>(
    `SELECT "assignedSalesExecId", "salesStage" FROM "Lead" WHERE id = $1`,
    [leadId],
  );
  if (!lead) return { error: "Lead not found." };
  if (lead.assignedSalesExecId !== session.id) {
    return { error: "This lead is not assigned to you." };
  }
  if (lead.salesStage !== SalesStage.CLOSED_LOST) {
    return { error: "Notes apply only to closed lost leads." };
  }

  await dbQuery(
    `UPDATE "Lead" SET "lostNotes" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
    [lostNotes, leadId],
  );

  revalidatePath("/executive", "layout");
  return { ok: true as const };
}
