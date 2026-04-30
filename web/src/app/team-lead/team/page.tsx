import { getSession } from "@/lib/auth/session";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";
import { UserRole } from "@/lib/constants";
import { MtlSalesTeamActionsEntry } from "@/components/mtl/mtl-sales-team-actions-entry";
import { MtlProvisionedPasswordCell } from "@/components/mtl/mtl-provisioned-password-cell";
import { MtlTransferExecButton } from "@/components/mtl/mtl-transfer-exec-button";
export default async function TeamLeadSalesTeamPage() {
  const session = await getSession();
  if (!session) return null;

  const team = session.teamId
    ? await dbQueryOne<{ name: string }>(
        `SELECT name FROM "Team" WHERE id = $1`,
        [session.teamId],
      )
    : null;

  const execs =
    session.teamId == null
      ? []
      : await dbQuery<{ id: string; name: string; email: string }>(
          `SELECT id, name, email FROM "User" WHERE "teamId" = $1 AND role = $2 ORDER BY name ASC`,
          [session.teamId, UserRole.SALES_EXECUTIVE],
        );

  const otherTeams =
    session.teamId == null
      ? []
      : await dbQuery<{
          id: string;
          name: string;
          mtl_name: string;
        }>(
          `SELECT t.id, t.name, u.name AS mtl_name
           FROM "Team" t
           JOIN "User" u ON u.id = t."mainTeamLeadId"
           WHERE t.id <> $1
           ORDER BY t.name ASC`,
          [session.teamId],
        );

  const transferTeamOptions = otherTeams.map((t) => ({
    id: t.id,
    name: t.name,
    mainTeamLeadName: t.mtl_name,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-lf-text md:text-3xl">
            Sales team
          </h1>
          <p className="mt-1 text-sm text-lf-muted">
            {team?.name ?? "Your team"} · add representatives and share login
            details once.
          </p>
        </div>
        <div className="shrink-0">
          <MtlSalesTeamActionsEntry teamName={team?.name ?? null} />
        </div>
      </header>

      <section className="rounded-2xl border border-lf-border bg-lf-surface p-5">
        <h2 className="text-base font-semibold text-lf-text">
          Sales executives ({execs.length})
        </h2>
        <p className="mt-1 text-sm text-lf-muted">
          The temporary password is shown only once when you create the account.
          New users must set a new password on first sign-in. Use Transfer to
          move a rep to another sales team when your organisation reassigns
          them.
        </p>
        <div className="mt-6 w-full overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
          <table className="w-full border-collapse text-[13px]">
            <thead className="border-b border-lf-border bg-lf-bg/80">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Temp. password</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {execs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    No sales executives yet. Use Add sales executive to create
                    one.
                  </td>
                </tr>
              ) : (
                execs.map((e) => (
                  <tr key={e.id} className="border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0">
                    <td className="px-4 py-3 text-[13px] font-medium text-lf-text-secondary">
                      {e.name}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-lf-text-secondary">{e.email}</td>
                    <td className="px-4 py-3 text-[13px] text-lf-text-secondary">
                      <MtlProvisionedPasswordCell />
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] text-lf-text-secondary">
                      <MtlTransferExecButton
                        execId={e.id}
                        execName={e.name}
                        teams={transferTeamOptions}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
