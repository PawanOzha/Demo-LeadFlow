import { getSession } from "@/lib/auth/session";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { AtlTeamMembersClient } from "@/components/atl/atl-team-members-client";
import type { TeamRow } from "@/components/atl/atl-team-members-client";
import { UserRole } from "@/lib/constants";

export default async function AnalystTeamLeadTeamPage() {
  const session = await getSession();
  if (!session) return null;

  const [atlProfile, analysts] = await Promise.all([
    dbQueryOne<{ analystTeamName: string | null }>(
      `SELECT "analystTeamName" FROM "User" WHERE id = $1`,
      [session.id],
    ),
    dbQuery<{
      id: string;
      name: string;
      email: string;
      analystTeamName: string | null;
    }>(
      `SELECT id, name, email, "analystTeamName" FROM "User"
       WHERE "managerId" = $1 AND role = $2 ORDER BY name ASC`,
      [session.id, UserRole.LEAD_ANALYST],
    ),
  ]);

  const teamRows = await dbQuery<{
    id: string;
    name: string;
    mtl_name: string;
    mtl_email: string;
  }>(
    `SELECT t.id, t.name, u.name AS mtl_name, u.email AS mtl_email
     FROM "Team" t
     JOIN "User" u ON u.id = t."mainTeamLeadId"
     ORDER BY t.name ASC`,
  );

  const teamIds = teamRows.map((t) => t.id);
  const waRows =
    teamIds.length === 0
      ? []
      : await dbQuery<{
          id: string;
          teamId: string;
          phone: string;
          label: string | null;
          sortOrder: number;
        }>(
          `SELECT id, "teamId", phone, label, "sortOrder" FROM "TeamWhatsApp"
           WHERE "teamId" = ANY($1::text[])
           ORDER BY "teamId", "sortOrder" ASC`,
          [teamIds],
        );

  const waByTeam = new Map<string, typeof waRows>();
  for (const w of waRows) {
    const list = waByTeam.get(w.teamId) ?? [];
    list.push(w);
    waByTeam.set(w.teamId, list);
  }

  const teams: TeamRow[] = teamRows.map((t) => ({
    id: t.id,
    name: t.name,
    mainTeamLead: { name: t.mtl_name, email: t.mtl_email },
    whatsappLines: (waByTeam.get(t.id) ?? []).map((w) => ({
      id: w.id,
      phone: w.phone,
      label: w.label,
    })),
  }));

  return (
    <div className="w-full min-w-0">
      <AtlTeamMembersClient
        analysts={analysts}
        teams={teams}
        defaultAnalystTeamName={atlProfile?.analystTeamName?.trim() || null}
      />
    </div>
  );
}
