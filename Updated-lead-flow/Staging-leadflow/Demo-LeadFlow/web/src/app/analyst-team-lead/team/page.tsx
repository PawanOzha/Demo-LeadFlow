import { getSession } from "@/lib/auth/session";
import { dbQuery, dbQueryOne, rpcJsonParamTextArrayUnpack } from "@/lib/db/pool";
import { AtlTeamMembersClient } from "@/components/atl/atl-team-members-client";
import type { TeamRow } from "@/components/atl/atl-team-members-client";
import { UserRole } from "@/lib/constants";
import {
  teamAnalystTeamLeadColumnExists,
  claimUnassignedTeamsForSessionIfSingleAtlOrg,
  isSingleAnalystTeamLeadOrg,
} from "@/lib/team-atl-column";

export default async function AnalystTeamLeadTeamPage() {
  const session = await getSession();
  if (!session) return null;

  await claimUnassignedTeamsForSessionIfSingleAtlOrg(session.id);

  const [atlProfile, analystRows] = await Promise.all([
    dbQueryOne<{ analystTeamName: string | null }>(
      `SELECT "analystTeamName" FROM "User" WHERE id = $1`,
      [session.id],
    ),
    dbQuery<{
      id: string;
      name: string;
      email: string;
      image: string | null;
      analystTeamName: string | null;
      must_reset: boolean;
    }>(
      `SELECT id, name, email, image, "analystTeamName",
        COALESCE("mustResetPassword", false) AS must_reset
       FROM "User"
       WHERE "managerId" = $1 AND role = $2 ORDER BY name ASC`,
      [session.id, UserRole.LEAD_ANALYST],
    ),
  ]);

  const analysts = analystRows.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    image: a.image,
    analystTeamName: a.analystTeamName,
    mustResetPassword: Boolean(a.must_reset),
  }));

  const teamCol = await teamAnalystTeamLeadColumnExists();
  const teamRows = await dbQuery<{
    id: string;
    name: string;
    mtl_id: string;
    mtl_name: string;
    mtl_email: string;
    mtl_image: string | null;
    mtl_must_reset: boolean;
  }>(
    teamCol
      ? `SELECT t.id, t.name, u.id AS mtl_id, u.name AS mtl_name, u.email AS mtl_email,
            u.image AS mtl_image,
            COALESCE(u."mustResetPassword", false) AS mtl_must_reset
     FROM "Team" t
     JOIN "User" u ON u.id = t."mainTeamLeadId"
     WHERE t."analystTeamLeadId" = $1
     ORDER BY t.name ASC`
      : `SELECT t.id, t.name, u.id AS mtl_id, u.name AS mtl_name, u.email AS mtl_email,
            u.image AS mtl_image,
            COALESCE(u."mustResetPassword", false) AS mtl_must_reset
     FROM "Team" t
     JOIN "User" u ON u.id = t."mainTeamLeadId"
     ORDER BY t.name ASC`,
    teamCol ? [session.id] : [],
  );

  let teamsDirectoryNotice: string | null = null;
  if (teamCol && teamRows.length === 0) {
    const orphanTeams = await dbQueryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "Team"`,
    );
    if (Number(orphanTeams?.c ?? 0) > 0) {
      const singleAtl = await isSingleAnalystTeamLeadOrg();
      teamsDirectoryNotice = singleAtl
        ? "Teams exist but none are linked to your directory yet. Refresh the page once; if this persists, ask an admin to verify migration 007 and Team.analystTeamLeadId."
        : "Some teams are not assigned to any analyst team lead directory (Team.analystTeamLeadId is empty). They stay hidden until an admin sets the correct owner on each Team row, or you add a new main team from Add member.";
    }
  }

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
           WHERE "teamId" = ANY(${rpcJsonParamTextArrayUnpack(1)})
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
    mainTeamLead: {
      id: t.mtl_id,
      name: t.mtl_name,
      email: t.mtl_email,
      image: t.mtl_image,
      mustResetPassword: Boolean(t.mtl_must_reset),
    },
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
        teamsDirectoryNotice={teamsDirectoryNotice}
      />
    </div>
  );
}
