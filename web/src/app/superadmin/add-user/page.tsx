import type { Metadata } from "next";
import Link from "next/link";
import { SuperadminAddUserCard } from "@/components/superadmin/superadmin-add-user-forms";
import { SuperadminUsersExportBar } from "@/components/superadmin/superadmin-users-export-bar";
import { SuperadminUsersTableClient } from "@/components/superadmin/superadmin-users-table-client";
import { toRscSerializableDashboardExport } from "@/lib/dashboard-export-types";
import { UserRole } from "@/lib/constants";
import { dbQuery, dbQueryOne } from "@/lib/db/pool";

export const metadata: Metadata = {
  title: "Add user · Superadmin",
};

function PaginationBar({
  totalCount,
  offset,
  perPage,
  page,
  totalPages,
  prevHref,
  nextHref,
}: {
  totalCount: number;
  offset: number;
  perPage: number;
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lf-border bg-lf-surface p-5 shadow-sm">
      <p className="text-lf-subtle">
        Showing{" "}
        <span className="font-semibold text-lf-text">
          {totalCount === 0 ? 0 : offset + 1}-
          {Math.min(offset + perPage, totalCount)}
        </span>{" "}
        of <span className="font-semibold text-lf-text">{totalCount}</span> users
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-lf-border px-3 py-1.5 text-xs text-lf-subtle opacity-50">
            Previous
          </span>
        )}
        <span className="text-xs text-lf-subtle">
          Page {Math.min(page, totalPages)} of {totalPages}
        </span>
        {nextHref ? (
          <Link
            href={nextHref}
            className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-lf-border px-3 py-1.5 text-xs text-lf-subtle opacity-50">
            Next
          </span>
        )}
      </div>
    </div>
  );
}

export default async function SuperadminAddUserPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pageRaw = Number(
    Array.isArray(sp.page) ? sp.page[0] : (sp.page ?? 1),
  );
  const perPageRaw = Number(
    Array.isArray(sp.perPage) ? sp.perPage[0] : (sp.perPage ?? 25),
  );
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const perPage = Number.isFinite(perPageRaw)
    ? Math.min(100, Math.max(10, Math.floor(perPageRaw)))
    : 25;
  const offset = (page - 1) * perPage;

  const [totalRow, userRows, exportRows, atlas] = await Promise.all([
    dbQueryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM "User"`),
    dbQuery<{
      id: string;
      email: string;
      name: string;
      role: string;
      passwordHash: string | null;
      analystTeamName: string | null;
      mgr_name: string | null;
      mgr_email: string | null;
      team_name: string | null;
    }>(
      `SELECT u.id, u.email, u.name, u.role, u."passwordHash", u."analystTeamName",
        mgr.name AS mgr_name, mgr.email AS mgr_email, tm.name AS team_name
       FROM "User" u
       LEFT JOIN "User" mgr ON mgr.id = u."managerId"
       LEFT JOIN "Team" tm ON tm.id = u."teamId"
       ORDER BY u.email ASC
       LIMIT ($1)::bigint OFFSET ($2)::bigint`,
      [perPage, offset],
    ),
    dbQuery<{
      id: string;
      email: string;
      name: string;
      role: string;
      analystTeamName: string | null;
      mgr_name: string | null;
      mgr_email: string | null;
      team_name: string | null;
    }>(
      `SELECT u.id, u.email, u.name, u.role, u."analystTeamName",
        mgr.name AS mgr_name, mgr.email AS mgr_email, tm.name AS team_name
       FROM "User" u
       LEFT JOIN "User" mgr ON mgr.id = u."managerId"
       LEFT JOIN "Team" tm ON tm.id = u."teamId"
       ORDER BY u.email ASC`,
    ),
    dbQuery<{
      id: string;
      name: string;
      email: string;
      analystTeamName: string | null;
    }>(
      `SELECT id, name, email, "analystTeamName" FROM "User"
       WHERE role = $1 ORDER BY name ASC`,
      [UserRole.ANALYST_TEAM_LEAD],
    ),
  ]);
  const totalCount = totalRow?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const qp = new URLSearchParams();
  qp.set("perPage", String(perPage));
  const prevHref =
    page > 1
      ? `/superadmin/add-user?${new URLSearchParams({
          ...Object.fromEntries(qp.entries()),
          page: String(page - 1),
        }).toString()}`
      : null;
  const nextHref =
    page < totalPages
      ? `/superadmin/add-user?${new URLSearchParams({
          ...Object.fromEntries(qp.entries()),
          page: String(page + 1),
        }).toString()}`
      : null;

  const users = userRows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    password: u.passwordHash,
    analystTeamName: u.analystTeamName,
    manager:
      u.mgr_name && u.mgr_email
        ? { name: u.mgr_name, email: u.mgr_email }
        : null,
    team: u.team_name ? { name: u.team_name } : null,
  }));

  const exportPayload = toRscSerializableDashboardExport({
    title: "Superadmin users",
    subtitle: "All user accounts",
    rangeLabel: "All users",
    generatedAt: new Date().toISOString(),
    fileNamePrefix: "superadmin-users",
    summaryRows: [
      { label: "Total users", value: totalCount },
      { label: "Page", value: `${Math.min(page, totalPages)} of ${totalPages}` },
    ],
    tables: [
      {
        title: "Users",
        headers: [
          "Email",
          "Name",
          "Role",
          "Manager name",
          "Manager email",
          "Team",
          "Analyst team",
        ],
        rows: exportRows.map((u) => [
          u.email,
          u.name,
          u.role,
          u.mgr_name ?? "",
          u.mgr_email ?? "",
          u.team_name ?? "",
          u.analystTeamName ?? "",
        ]),
      },
    ],
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          
        </div>
        <SuperadminAddUserCard atlas={atlas} />
      </div>
      <SuperadminUsersExportBar payload={exportPayload} />
      <PaginationBar
        totalCount={totalCount}
        offset={offset}
        perPage={perPage}
        page={page}
        totalPages={totalPages}
        prevHref={prevHref}
        nextHref={nextHref}
      />
      <SuperadminUsersTableClient users={users} />
      <PaginationBar
        totalCount={totalCount}
        offset={offset}
        perPage={perPage}
        page={page}
        totalPages={totalPages}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  );
}
