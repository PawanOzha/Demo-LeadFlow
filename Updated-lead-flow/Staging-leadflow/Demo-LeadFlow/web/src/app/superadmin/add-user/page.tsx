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

const EXPORT_ROW_CAP = 5000;

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function buildHref(
  pathname: string,
  query: Record<string, string | undefined>,
  patch?: Record<string, string | undefined>,
) {
  const p = new URLSearchParams();
  const merged = { ...query, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    const t = v?.trim();
    if (t) p.set(k, t);
  }
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

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
  const pageRaw = Number(first(sp.page) ?? 1);
  const perPageRaw = Number(first(sp.perPage) ?? 25);
  const roleRaw = (first(sp.role) ?? "").trim();
  const qRaw = (first(sp.q) ?? "").trim();
  const roleFilter = (Object.values(UserRole) as string[]).includes(roleRaw)
    ? roleRaw
    : "";
  const qFilter = qRaw.slice(0, 200);
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const perPage = Number.isFinite(perPageRaw)
    ? Math.min(100, Math.max(10, Math.floor(perPageRaw)))
    : 25;

  const whereSql = `
    WHERE ($1::text IS NULL OR u."role" = $1)
      AND ($2::text IS NULL OR (
            u."name" ILIKE $2 OR u."email" ILIKE $2
          ))
  `;
  const whereParams: [string | null, string | null] = [
    roleFilter || null,
    qFilter ? `%${qFilter}%` : null,
  ];

  const [totalRow, pagedUserRows, exportRows, atlas] = await Promise.all([
    dbQueryOne<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM "User" u
       ${whereSql}`,
      whereParams,
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
       ${whereSql}
       ORDER BY u.email ASC, u.id ASC
       LIMIT ($3)::bigint OFFSET ($4)::bigint`,
      [...whereParams, perPage, (page - 1) * perPage],
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
       ${whereSql}
       ORDER BY u.email ASC
       LIMIT ($3)::bigint`,
      [...whereParams, EXPORT_ROW_CAP],
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
  const totalCount = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * perPage;
  const userRows = pagedUserRows;
  const baseQuery: Record<string, string | undefined> = {
    role: roleFilter || undefined,
    q: qFilter || undefined,
    perPage: String(perPage),
  };
  const prevHref =
    safePage > 1
      ? buildHref("/superadmin/add-user", baseQuery, {
          page: String(safePage - 1),
        })
      : null;
  const nextHref =
    safePage < totalPages
      ? buildHref("/superadmin/add-user", baseQuery, {
          page: String(safePage + 1),
        })
      : null;

  const users = userRows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    analystTeamName: u.analystTeamName,
    manager:
      u.mgr_name && u.mgr_email
        ? { name: u.mgr_name, email: u.mgr_email }
        : null,
    team: u.team_name ? { name: u.team_name } : null,
  }));

  const exportPayload = toRscSerializableDashboardExport({
    title: "Superadmin users",
    subtitle: "Filtered user accounts",
    rangeLabel: roleFilter ? `Role: ${roleFilter}` : "All roles",
    generatedAt: new Date().toISOString(),
    fileNamePrefix: "superadmin-users",
    summaryRows: [
      { label: "Total users", value: totalCount },
      {
        label: "Search",
        value: qFilter || "All",
      },
      { label: "Page", value: `${safePage} of ${totalPages}` },
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
          <form
            method="GET"
            action="/superadmin/add-user"
            className="grid gap-3 rounded-xl border border-lf-border bg-lf-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-lf-muted">
              Role
              <select
                name="role"
                defaultValue={roleFilter}
                className="h-9 rounded-lg border border-lf-border bg-lf-surface px-3 text-sm font-normal normal-case text-lf-text-secondary"
              >
                <option value="">All roles</option>
                {Object.values(UserRole).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-lf-muted sm:col-span-2">
              Search
              <input
                name="q"
                defaultValue={qFilter}
                placeholder="Name or email..."
                className="h-9 rounded-lg border border-lf-border bg-lf-surface px-3 text-sm font-normal normal-case text-lf-text-secondary"
              />
            </label>
            <input type="hidden" name="perPage" value={String(perPage)} />
            <input type="hidden" name="page" value="1" />
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-9 rounded-lg bg-lf-brand px-4 text-sm font-semibold text-white"
              >
                Apply
              </button>
              <Link
                href={buildHref("/superadmin/add-user", { perPage: String(perPage) })}
                className="h-9 rounded-lg border border-lf-border px-4 text-sm font-medium text-lf-text-secondary"
              >
                Clear
              </Link>
            </div>
          </form>
        </div>
        <SuperadminAddUserCard atlas={atlas} />
      </div>
      <SuperadminUsersExportBar payload={exportPayload} />
      <PaginationBar
        totalCount={totalCount}
        offset={offset}
        perPage={perPage}
        page={safePage}
        totalPages={totalPages}
        prevHref={prevHref}
        nextHref={nextHref}
      />
      <SuperadminUsersTableClient users={users} />
      <PaginationBar
        totalCount={totalCount}
        offset={offset}
        perPage={perPage}
        page={safePage}
        totalPages={totalPages}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  );
}
