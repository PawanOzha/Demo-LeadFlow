import type { Metadata } from "next";
import Link from "next/link";
import { dbQuery } from "@/lib/db/pool";
import { getSuperadminDashboardMetrics } from "@/lib/superadmin-stats";

export const metadata: Metadata = {
  title: "Dashboard · Superadmin",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-lf-border bg-lf-surface/90 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-lf-subtle">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-lf-text">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-lf-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

type TransferRow = {
  id: string;
  createdAt: Date;
  se_name: string;
  se_email: string;
  from_name: string | null;
  to_name: string;
  tb_name: string;
  tb_email: string;
};

export default async function SuperadminDashboardPage() {
  const [metrics, transferRows] = await Promise.all([
    getSuperadminDashboardMetrics(),
    dbQuery<TransferRow>(
      `SELECT t.id, t."createdAt",
        se.name AS se_name, se.email AS se_email,
        ft.name AS from_name,
        tt.name AS to_name,
        tb.name AS tb_name, tb.email AS tb_email
       FROM "SalesExecTeamTransfer" t
       JOIN "User" se ON se.id = t."salesExecId"
       LEFT JOIN "Team" ft ON ft.id = t."fromTeamId"
       JOIN "Team" tt ON tt.id = t."toTeamId"
       JOIN "User" tb ON tb.id = t."transferredById"
       ORDER BY t."createdAt" DESC LIMIT 40`,
    ),
  ]);

  const seTransfers = transferRows.map((t) => ({
    id: t.id,
    createdAt: t.createdAt,
    salesExec: { name: t.se_name, email: t.se_email },
    fromTeam: t.from_name ? { name: t.from_name } : null,
    toTeam: { name: t.to_name },
    transferredBy: { name: t.tb_name, email: t.tb_email },
  }));

  return (
    <div className="space-y-12">
      <div>
        <p className="max-w-2xl text-sm text-lf-muted">
          Snapshot of users, pipeline volume, and how leads are associated with
          teams and sales executives (current assignments).           For the full lead
          handoff event log, open{" "}
          <Link
            href="/superadmin/transfer-log"
            className="font-medium text-lf-link underline-offset-2 hover:underline"
          >
            Lead transfer log
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Active users"
          value={metrics.activeUsers}
          hint="Analysts, TLs, main TLs, sales execs"
        />
        <StatCard label="Total leads" value={metrics.totalLeads} />
        <StatCard label="Qualified leads" value={metrics.qualified} />
        <StatCard label="Not qualified" value={metrics.notQualified} />
        <StatCard label="Irrelevant leads" value={metrics.irrelevant} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total closed revenue"
          value={metrics.totalClosedRevenue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
          hint="Sum of closed revenue on won deals (numeric sum — align currency across deals for reporting)."
        />
        <StatCard
          label="Total pipeline estimate"
          value={metrics.totalPipelineEstimate.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
          hint="Sum of optional analyst estimates at lead creation."
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-lf-text-secondary">
            Leads routed to teams
          </h2>
          <p className="mt-1 text-xs text-lf-subtle">
            Count of leads with a team assignment (current state).
          </p>
          <div className="mt-4 w-full overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
            <table className="w-full min-w-[280px] border-collapse text-[13px]">
              <thead className="border-b border-lf-border bg-lf-bg/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Team</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Leads</th>
                </tr>
              </thead>
              <tbody>
                {metrics.leadsByTeam.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-16 text-center text-[13px] text-lf-muted"
                    >
                      No team-routed leads yet.
                    </td>
                  </tr>
                ) : (
                  metrics.leadsByTeam.map((row) => (
                    <tr key={row.teamId} className="border-b border-lf-divide text-[13px] text-lf-text-secondary last:border-b-0">
                      <td className="px-4 py-3 text-[13px] text-lf-text-secondary">{row.teamName}</td>
                      <td className="px-4 py-3 text-[13px] text-lf-text-secondary tabular-nums">
                        {row.count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-lf-text-secondary">
            Leads with sales executive
          </h2>
          <p className="mt-1 text-xs text-lf-subtle">
            Count of leads currently assigned to each rep (or historically
            holding assignment).
          </p>
          <div className="mt-4 w-full overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
            <table className="w-full min-w-[280px] border-collapse text-[13px]">
              <thead className="border-b border-lf-border bg-lf-bg/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Sales executive</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Leads</th>
                </tr>
              </thead>
              <tbody>
                {metrics.leadsBySalesExec.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-16 text-center text-[13px] text-lf-muted"
                    >
                      No assignments yet.
                    </td>
                  </tr>
                ) : (
                  metrics.leadsBySalesExec.map((row) => (
                    <tr key={row.salesExecId} className="border-b border-lf-divide text-[13px] text-lf-text-secondary last:border-b-0">
                      <td className="max-w-[240px] px-4 py-3 text-[13px] text-lf-text-secondary">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-lf-text-secondary tabular-nums">
                        {row.count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-lf-text">
          Sales executive team transfers
        </h2>
        <p className="text-sm text-lf-subtle">
          When a main team lead moves a rep to another team.
        </p>
        <div className="w-full overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead className="border-b border-lf-border bg-lf-bg/80">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">When</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Sales executive</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">From team</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">To team</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Transferred by (MTL)</th>
              </tr>
            </thead>
            <tbody>
              {seTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    No sales executive transfers recorded yet.
                  </td>
                </tr>
              ) : (
                seTransfers.map((t) => (
                  <tr key={t.id} className="align-top border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-lf-subtle">
                      {t.createdAt.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-lf-text-secondary">
                      {t.salesExec.name}
                      <br />
                      <span className="text-lf-subtle">{t.salesExec.email}</span>
                    </td>
                    <td className="px-4 py-3 text-lf-muted">
                      {t.fromTeam?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-lf-text-secondary">{t.toTeam.name}</td>
                    <td className="px-4 py-3 text-xs text-lf-text-secondary">
                      {t.transferredBy.name}
                      <br />
                      <span className="text-lf-subtle">
                        {t.transferredBy.email}
                      </span>
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
