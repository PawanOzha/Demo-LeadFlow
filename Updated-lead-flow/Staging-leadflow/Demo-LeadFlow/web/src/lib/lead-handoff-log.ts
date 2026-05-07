import { newId, dbQuery } from "@/lib/db/pool";

export async function logLeadHandoff(opts: {
  leadId: string;
  action: string;
  actorId: string | null;
  detail?: string | null;
}) {
  const id = newId();
  await dbQuery(
    `INSERT INTO "LeadHandoffLog" (id, "leadId", action, "actorId", detail)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      id,
      opts.leadId,
      opts.action,
      opts.actorId,
      opts.detail ?? null,
    ],
  );
}
