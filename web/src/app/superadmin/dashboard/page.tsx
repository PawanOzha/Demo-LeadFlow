import type { Metadata } from "next";
import { dbQuery } from "@/lib/db/pool";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import {
  superadminHandoffLabels,
  superadminRoleLabel,
} from "@/lib/superadmin-ui";
import { getSuperadminDashboardMetrics } from "@/lib/superadmin-stats";

function first(sp: string | string[] | undefined): string | undefined {
  if (Array.isArray(sp)) return sp[0];
  return sp;
}

function parseHandoffPaging(sp: Record<string, string | string[] | undefined>): {
  page: number;
  perPage: 25 | 50 | 100;
} {
  const pageRaw = Number.parseInt(first(sp.page) ?? "", 10);
  const perPageRaw = Number.parseInt(first(sp.perPage) ?? "", 10);
  const perPage: 25 | 50 | 100 =
    perPageRaw === 50 || perPageRaw === 100 ? perPageRaw : 25;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  return { page, perPage };
}

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

type HandoffRow = {
  id: string;
  createdAt: Date;
  action: string;
  detail: string | null;
  lead_id: string | null;
  lead_leadName: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
};

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

export default async function SuperadminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page: pageRaw, perPage } = parseHandoffPaging(sp);

  const [metrics, handoffCountRow, transferRows] = await Promise.all([
    getSuperadminDashboardMetrics(),
    dbQuery<{ c: string }>(`SELECT COUNT(*)::text AS c FROM "LeadHandoffLog"`),
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

  const totalHandoffs = Number(handoffCountRow[0]?.c ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalHandoffs / perPage));
  const page = Math.min(pageRaw, totalPages);
  const offset = (page - 1) * perPage;

  const handoffRows = await dbQuery<HandoffRow>(
    `SELECT h.id, h."createdAt", h.action, h.detail,
        l.id AS lead_id, l."leadName" AS lead_leadName,
        a.name AS actor_name, a.email AS actor_email, a.role AS actor_role
       FROM "LeadHandoffLog" h
       LEFT JOIN "Lead" l ON l.id = h."leadId"
       LEFT JOIN "User" a ON a.id = h."actorId"
       ORDER BY h."createdAt" DESC
       LIMIT $1 OFFSET $2`,
    [perPage, offset],
  );

  const handoffs = handoffRows.map((h) => ({
    id: h.id,
    createdAt: h.createdAt,
    action: h.action,
    detail: h.detail,
    lead: {
      id: h.lead_id ?? "",
      leadName: h.lead_leadName ?? "",
    },
    actor:
      h.actor_name && h.actor_email && h.actor_role
        ? {
            name: h.actor_name,
            email: h.actor_email,
            role: h.actor_role,
          }
        : null,
  }));

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
        <h1 className="text-2xl font-semibold tracking-tight text-lf-text">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-lf-muted">
          Snapshot of users, pipeline volume, and how leads are associated with
          teams and sales executives (current assignments).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-lf-text-secondary">
            Leads routed to teams
          </h2>
          <p className="mt-1 text-xs text-lf-subtle">
            Count of leads with a team assignment (current state).
          </p>
          <div className="mt-4 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[280px] border-collapse text-[13px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Team</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Leads</th>
                </tr>
              </thead>
              <tbody>
                {metrics.leadsByTeam.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-16 text-center text-[13px] text-gray-400"
                    >
                      No team-routed leads yet.
                    </td>
                  </tr>
                ) : (
                  metrics.leadsByTeam.map((row) => (
                    <tr key={row.teamId} className="border-b border-gray-100 text-[13px] text-gray-700 last:border-b-0">
                      <td className="px-4 py-3 text-[13px] text-gray-700">{row.teamName}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-700 tabular-nums">
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
          <div className="mt-4 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[280px] border-collapse text-[13px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sales executive</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Leads</th>
                </tr>
              </thead>
              <tbody>
                {metrics.leadsBySalesExec.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-16 text-center text-[13px] text-gray-400"
                    >
                      No assignments yet.
                    </td>
                  </tr>
                ) : (
                  metrics.leadsBySalesExec.map((row) => (
                    <tr key={row.salesExecId} className="border-b border-gray-100 text-[13px] text-gray-700 last:border-b-0">
                      <td className="max-w-[240px] px-4 py-3 text-[13px] text-gray-700">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-700 tabular-nums">
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
        <h2 className="text-lg font-semibold text-lf-text">Lead transfer log</h2>
        <p className="text-sm text-lf-subtle">
          Recent routing and close events (newest first).
        </p>
        <PortalPaginationBar
          pathname="/superadmin/dashboard"
          query={{ perPage: String(perPage) }}
          page={page}
          perPage={perPage}
          totalCount={totalHandoffs}
          countNoun="events"
        />
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[800px] border-collapse text-[13px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">When</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Lead</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Action</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Actor</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Detail</th>
              </tr>
            </thead>
            <tbody>
              {handoffs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center text-[13px] text-gray-400"
                  >
                    No handoff events yet.
                  </td>
                </tr>
              ) : (
                handoffs.map((h) => (
                  <tr key={h.id} className="align-top border-b border-gray-100 text-[13px] text-gray-700 transition-colors hover:bg-gray-50 last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-lf-subtle">
                      {h.createdAt.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-lf-text-secondary">
                      {h.lead.leadName || h.lead.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-lf-muted">
                      {superadminHandoffLabels[h.action] ?? h.action}
                    </td>
                    <td className="px-4 py-3 text-xs text-lf-text-secondary">
                      {h.actor ? (
                        <>
                          {h.actor.name}
                          <br />
                          <span className="text-lf-subtle">
                            {superadminRoleLabel(h.actor.role)} ·{" "}
                            {h.actor.email}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-md px-4 py-3 text-xs text-lf-subtle">
                      {h.detail ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PortalPaginationBar
          pathname="/superadmin/dashboard"
          query={{ perPage: String(perPage) }}
          page={page}
          perPage={perPage}
          totalCount={totalHandoffs}
          countNoun="events"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-lf-text">
          Sales executive team transfers
        </h2>
        <p className="text-sm text-lf-subtle">
          When a main team lead moves a rep to another team.
        </p>
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">When</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sales executive</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">From team</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">To team</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Transferred by (MTL)</th>
              </tr>
            </thead>
            <tbody>
              {seTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center text-[13px] text-gray-400"
                  >
                    No sales executive transfers recorded yet.
                  </td>
                </tr>
              ) : (
                seTransfers.map((t) => (
                  <tr key={t.id} className="align-top border-b border-gray-100 text-[13px] text-gray-700 transition-colors hover:bg-gray-50 last:border-b-0">
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
