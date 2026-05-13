"use server";

import { revalidatePath } from "next/cache";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { getSession } from "@/lib/auth/session";
import { LeadHandoffAction, SalesStage, UserRole } from "@/lib/constants";
import { logLeadHandoff } from "@/lib/lead-handoff-log";
import { parseRequiredMoney, coerceMoney } from "@/lib/deal-money";
import { execLeadSql } from "@/lib/exec-leads";
import { normalizeClientSearchQuery } from "@/lib/lead-client-search";
import { PORTAL_LEADS_EXPORT_ROW_CAP } from "@/lib/portal-leads-export-cap";
import type { PortalExecLeadExportRow } from "@/lib/portal-all-leads-export-payloads";

export async function updateLeadSalesOutcome(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.SALES_EXECUTIVE) {
    return { error: "Unauthorized." };
  }

  const leadId = String(formData.get("leadId") ?? "");
  const salesStage = String(formData.get("salesStage") ?? "");
  const lostNotesRaw = String(formData.get("lostNotes") ?? "").trim();
  const closedRevenueRaw = String(formData.get("closedRevenue") ?? "").trim();

  if (!leadId) return { error: "Lead is required." };
  if (salesStage !== SalesStage.CLOSED_WON && salesStage !== SalesStage.CLOSED_LOST) {
    return { error: "Invalid status." };
  }

  const lead = await dbQueryOne<{
    assignedSalesExecId: string | null;
    dealCurrency: string | null;
  }>(
    `SELECT "assignedSalesExecId", "dealCurrency" FROM "Lead" WHERE id = $1`,
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

  let closedRevenue: number | null = null;
  if (salesStage === SalesStage.CLOSED_WON) {
    const parsed = parseRequiredMoney(closedRevenueRaw);
    if (typeof parsed !== "number") {
      return { error: parsed.error };
    }
    closedRevenue = parsed;
  }

  const now = new Date();
  await dbQuery(
    `UPDATE "Lead" SET
      "salesStage" = $1,
      "closedAt" = $2,
      "execDeadlineAt" = NULL,
      "lostNotes" = $3,
      "closedRevenue" = $4,
      "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [
      salesStage,
      now,
      salesStage === SalesStage.CLOSED_LOST ? lostNotesRaw : null,
      closedRevenue,
      leadId,
    ],
  );

  const currency = lead.dealCurrency?.trim() || "USD";
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
        : `Won · ${closedRevenue != null ? `${currency} ${closedRevenue}` : ""}`,
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

export async function fetchExecLeadsExportAction(params: {
  from: string | null;
  to: string | null;
  q: string | null;
}): Promise<{ ok: true; rows: PortalExecLeadExportRow[] } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== UserRole.SALES_EXECUTIVE) {
    return { ok: false, error: "Unauthorized." };
  }
  // analystRangeParams validates date strings; here we trust the client-passed values
  // which were originally parsed by analystRangeParams on the server page.
  const { from, to, q } = params;
  const { clause, params: sqlParams } = execLeadSql(session.id, {
    dateFrom: from ?? undefined,
    dateTo: to ?? undefined,
    q: normalizeClientSearchQuery(q) ?? undefined,
  });
  try {
    const rows = await dbQuery<{
      leadName: string;
      phone: string | null;
      leadEmail: string | null;
      source: string;
      notes: string | null;
      lostNotes: string | null;
      leadScore: number | null;
      salesStage: string;
      execDeadlineAt: Date | null;
      createdAt: Date;
      estimatedDealValue: unknown;
      closedRevenue: unknown;
      dealCurrency: string;
      cb_name: string | null;
    }>(
      `SELECT l."leadName", l.phone, l."leadEmail", l.source, l.notes, l."lostNotes", l."leadScore", l."salesStage", l."execDeadlineAt", l."createdAt", l."estimatedDealValue", l."closedRevenue", l."dealCurrency", cb.name AS cb_name
       FROM "Lead" l LEFT JOIN "User" cb ON cb.id = l."createdById"
       WHERE ${clause}
       ORDER BY l."createdAt" DESC, l.id DESC LIMIT ($${sqlParams.length + 1})::bigint`,
      [...sqlParams, PORTAL_LEADS_EXPORT_ROW_CAP],
    );
    return {
      ok: true,
      rows: rows.map((l) => ({
        leadName: l.leadName,
        phone: l.phone,
        leadEmail: l.leadEmail,
        source: l.source,
        notes: l.notes,
        lostNotes: l.lostNotes,
        leadScore: l.leadScore,
        salesStage: l.salesStage,
        execDeadlineAt: l.execDeadlineAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
        analystName: l.cb_name ?? "Unknown analyst",
        estimatedDealValue: coerceMoney(l.estimatedDealValue),
        closedRevenue: coerceMoney(l.closedRevenue),
        dealCurrency: l.dealCurrency?.trim() || "USD",
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Export failed. Please try again." };
  }
}
