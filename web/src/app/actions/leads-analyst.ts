"use server";

import { revalidatePath } from "next/cache";
import { dbQuery, dbQueryOne, newId } from "@/lib/db/pool";
import { getSession } from "@/lib/auth/session";
import {
  LeadHandoffAction,
  QualificationStatus,
  SalesStage,
  UserRole,
} from "@/lib/constants";
import { logLeadHandoff } from "@/lib/lead-handoff-log";
import { countryNameFromPhone } from "@/lib/phone-location";
import { isValidPhoneNumber } from "libphonenumber-js";
import {
  type LeadSourceValue,
  LEAD_SOURCE_OPTIONS,
  resolveLeadSourceLabel,
} from "@/lib/lead-sources";
import {
  isAllowedQualificationReason,
  joinNotesWithQualificationReason,
} from "@/lib/qualification-reasons";
import {
  normalizeDealCurrency,
  parseOptionalMoney,
} from "@/lib/deal-money";

const SOURCE_VALUES = new Set(
  LEAD_SOURCE_OPTIONS.map((o) => o.value as LeadSourceValue),
);

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** YYYY/MM/DD or YYYY-MM-DD -> local start-of-day, or null if invalid. */
function parseLocalDateYmd(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d, 0, 0, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function createLeadAnalyst(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== UserRole.LEAD_ANALYST) {
    return { error: "Unauthorized." };
  }

  const leadName = String(formData.get("leadName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const leadEmailRaw = String(formData.get("leadEmail") ?? "").trim();
  const leadEmail = leadEmailRaw || null;
  const leadSource = String(formData.get("leadSource") ?? "").trim();
  const sourceOther = String(formData.get("sourceOther") ?? "").trim() || null;
  let sourceWebsiteName =
    String(formData.get("sourceWebsiteName") ?? "").trim() || null;
  let sourceMetaProfileName =
    String(formData.get("sourceMetaProfileName") ?? "").trim() || null;
  if (
    leadSource !== "WEBSITE_WHATSAPP" &&
    leadSource !== "WEBSITE_LEAD_FORMS"
  ) {
    sourceWebsiteName = null;
  }
  if (
    leadSource !== "META_WHATSAPP" &&
    leadSource !== "META_MESSENGER" &&
    leadSource !== "META_LEAD_FORMS"
  ) {
    sourceMetaProfileName = null;
  }
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const qualificationReason =
    String(formData.get("qualificationReason") ?? "").trim() || null;
  const qualificationStatus = String(
    formData.get("qualificationStatus") ?? "",
  ) as (typeof QualificationStatus)[keyof typeof QualificationStatus];
  const scoreRaw = String(formData.get("leadScore") ?? "").trim();
  const leadScore = scoreRaw === "" ? null : Number.parseInt(scoreRaw, 10);
  const leadAddedDateRaw = String(formData.get("leadAddedDate") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const estimatedRaw = String(formData.get("estimatedDealValue") ?? "");
  const dealCurrency = normalizeDealCurrency(
    String(formData.get("dealCurrency") ?? ""),
  );
  const estimatedParsed = parseOptionalMoney(estimatedRaw);
  if (!estimatedParsed.ok) return { error: estimatedParsed.error };
  const estimatedDealValue = estimatedParsed.value;

  if (!leadName) return { error: "Full name is required." };
  if (!phone) {
    return { error: "Phone number with country code is required." };
  }
  if (!isValidPhoneNumber(phone)) {
    return {
      error:
        "Enter a valid phone number for the selected country (include country code).",
    };
  }
  if (!SOURCE_VALUES.has(leadSource as LeadSourceValue)) {
    return { error: "Select a lead source." };
  }
  if (leadEmail && !isValidEmail(leadEmail)) {
    return { error: "Enter a valid lead email." };
  }
  if (
    qualificationStatus !== QualificationStatus.QUALIFIED &&
    qualificationStatus !== QualificationStatus.NOT_QUALIFIED &&
    qualificationStatus !== QualificationStatus.IRRELEVANT
  ) {
    return { error: "Invalid qualification." };
  }
  if (!isAllowedQualificationReason(qualificationStatus, qualificationReason)) {
    return { error: "Select a valid reason for this qualification status." };
  }
  if (
    leadScore !== null &&
    (Number.isNaN(leadScore) || leadScore < 0 || leadScore > 100)
  ) {
    return { error: "Lead score must be between 0 and 100." };
  }

  let createdAt: Date | undefined;
  if (leadAddedDateRaw) {
    const parsed = parseLocalDateYmd(leadAddedDateRaw);
    if (!parsed) {
      return { error: "Enter date in YYYY/MM/DD format (or leave it blank)." };
    }
    if (parsed > startOfTodayLocal()) {
      return { error: "Date added cannot be in the future." };
    }
    createdAt = parsed;
  }

  const source = resolveLeadSourceLabel(leadSource, sourceOther, {
    websiteName: sourceWebsiteName,
    metaProfileName: sourceMetaProfileName,
  });
  const country = countryNameFromPhone(phone) ?? "Unknown";
  const storedNotes = joinNotesWithQualificationReason(qualificationReason, notes);

  const leadId = newId();

  if (createdAt) {
    await dbQuery(
      `INSERT INTO "Lead" (
        id, "leadName", phone, "leadEmail", country, city, source, "sourceWebsiteName", "sourceMetaProfileName",
        notes, "qualificationStatus", "leadScore", "salesStage", "createdById", "createdAt", "updatedAt", "internalReassignCount",
        "estimatedDealValue", "dealCurrency"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, 0,
        $16, $17
      )`,
      [
        leadId,
        leadName,
        phone,
        leadEmail,
        country,
        city,
        source,
        sourceWebsiteName,
        sourceMetaProfileName,
        storedNotes,
        qualificationStatus,
        leadScore,
        SalesStage.PRE_SALES,
        session.id,
        createdAt,
        estimatedDealValue,
        dealCurrency,
      ],
    );
  } else {
    await dbQuery(
      `INSERT INTO "Lead" (
        id, "leadName", phone, "leadEmail", country, city, source, "sourceWebsiteName", "sourceMetaProfileName",
        notes, "qualificationStatus", "leadScore", "salesStage", "createdById", "createdAt", "updatedAt", "internalReassignCount",
        "estimatedDealValue", "dealCurrency"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0,
        $15, $16
      )`,
      [
        leadId,
        leadName,
        phone,
        leadEmail,
        country,
        city,
        source,
        sourceWebsiteName,
        sourceMetaProfileName,
        storedNotes,
        qualificationStatus,
        leadScore,
        SalesStage.PRE_SALES,
        session.id,
        estimatedDealValue,
        dealCurrency,
      ],
    );
  }

  await logLeadHandoff({
    leadId,
    action: LeadHandoffAction.LEAD_CREATED,
    actorId: session.id,
    detail: `Created by ${session.name ?? session.email}`,
  });

  revalidatePath("/analyst", "layout");
  return { ok: true as const };
}

export async function updateLeadQualificationAnalyst(
  leadId: string,
  qualificationStatus: string,
) {
  const session = await getSession();
  if (!session || session.role !== UserRole.LEAD_ANALYST) {
    return { error: "Unauthorized." };
  }

  if (
    qualificationStatus !== QualificationStatus.QUALIFIED &&
    qualificationStatus !== QualificationStatus.NOT_QUALIFIED &&
    qualificationStatus !== QualificationStatus.IRRELEVANT
  ) {
    return { error: "Invalid qualification." };
  }

  const lead = await dbQueryOne<{
    id: string;
    leadName: string;
    qualificationStatus: string;
    analystName: string;
    managerId: string | null;
  }>(
    `SELECT l.id, l."leadName", l."qualificationStatus", u.name AS "analystName", u."managerId"
     FROM "Lead" l
     INNER JOIN "User" u ON u.id = l."createdById"
     WHERE l.id = $1 AND l."createdById" = $2`,
    [leadId, session.id],
  );
  if (!lead) return { error: "Lead not found." };

  const previousStatus = lead.qualificationStatus;

  await dbQuery(
    `UPDATE "Lead" SET "qualificationStatus" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
    [qualificationStatus, leadId],
  );

  if (
    qualificationStatus === QualificationStatus.QUALIFIED &&
    previousStatus !== QualificationStatus.QUALIFIED &&
    lead.managerId
  ) {
    const manager = await dbQueryOne<{ role: string }>(
      `SELECT role FROM "User" WHERE id = $1`,
      [lead.managerId],
    );
    if (manager?.role === UserRole.ANALYST_TEAM_LEAD) {
      const displayName = lead.leadName?.trim() || "A lead";
      const notifId = newId();
      await dbQuery(
        `INSERT INTO "Notification" (id, "recipientId", kind, "leadId", title, body, "read", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, false, CURRENT_TIMESTAMP)`,
        [
          notifId,
          lead.managerId,
          "LEAD_QUALIFIED",
          lead.id,
          `${displayName} marked qualified`,
          `Updated by ${lead.analystName}`,
        ],
      );
    }
  }

  revalidatePath("/analyst", "layout");
  revalidatePath("/analyst-team-lead", "layout");
  return { ok: true as const };
}
