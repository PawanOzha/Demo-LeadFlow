import type { Metadata } from "next";
import { dbQuery } from "@/lib/db/pool";
import { PortalPaginationBar } from "@/components/portal-pagination-bar";
import {
  superadminHandoffLabels,
  superadminRoleLabel,
} from "@/lib/superadmin-ui";
import { parseHandoffLogPaging } from "@/lib/superadmin-handoff-log-paging";

export const metadata: Metadata = {
  title: "Lead transfer log · Superadmin",
};

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

export default async function SuperadminTransferLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page: pageRaw, perPage } = parseHandoffLogPaging(sp);

  const handoffCountRow = await dbQuery<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "LeadHandoffLog"`,
  );
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
       LIMIT ($1)::bigint OFFSET ($2)::bigint`,
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

  return (
    <div className="space-y-6">
      <div>
        <p className="max-w-2xl text-sm text-lf-muted">
          Recent routing and close events from the lead handoff log (newest
          first).
        </p>
      </div>

      <section className="space-y-4">
        <PortalPaginationBar
          pathname="/superadmin/transfer-log"
          query={
            perPage !== 25 ? { perPage: String(perPage) } : {}
          }
          page={page}
          perPage={perPage}
          totalCount={totalHandoffs}
          countNoun="events"
        />
        <div className="w-full overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
          <table className="w-full min-w-[800px] border-collapse text-[13px]">
            <thead className="border-b border-lf-border bg-lf-bg/80">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  When
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Lead
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {handoffs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center text-[13px] text-lf-muted"
                  >
                    No handoff events yet.
                  </td>
                </tr>
              ) : (
                handoffs.map((h) => (
                  <tr
                    key={h.id}
                    className="align-top border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0"
                  >
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
          pathname="/superadmin/transfer-log"
          query={
            perPage !== 25 ? { perPage: String(perPage) } : {}
          }
          page={page}
          perPage={perPage}
          totalCount={totalHandoffs}
          countNoun="events"
        />
      </section>
    </div>
  );
}
