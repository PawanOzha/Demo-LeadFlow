"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { superadminDeleteUsersBulkFormAction } from "@/app/actions/superadmin";
import { SuperadminAddUserCard } from "@/components/superadmin/superadmin-add-user-forms";
import { SuperadminDeleteForm } from "@/components/superadmin/superadmin-delete-form";
import { SuperadminPasswordForm } from "@/components/superadmin/superadmin-password-form";
import { SuperadminUsersExportBar } from "@/components/superadmin/superadmin-users-export-bar";
import { UserRole } from "@/lib/constants";
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";
import { superadminRoleLabel } from "@/lib/superadmin-ui";

const PROTECTED_SUPERADMIN_EMAIL = "superadmin@demo.local";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  password: string | null;
  analystTeamName: string | null;
  manager: { name: string; email: string } | null;
  team: { name: string } | null;
};

type AtlasOption = {
  id: string;
  name: string;
  email: string;
  analystTeamName: string | null;
};

export function SuperadminUsersTableClient({
  users,
  atlas,
  exportPayload,
}: {
  users: UserRow[];
  atlas: AtlasOption[];
  exportPayload: DashboardExportPayload;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkState, bulkAction, bulkPending] = useActionState(
    superadminDeleteUsersBulkFormAction,
    undefined,
  );
  const wasBulkPending = useRef(false);
  const isNonDeletable = (u: UserRow) =>
    u.role === UserRole.SUPERADMIN ||
    u.email.trim().toLowerCase() === PROTECTED_SUPERADMIN_EMAIL;

  const allUserIds = useMemo(
    () => users.filter((u) => !isNonDeletable(u)).map((u) => u.id),
    [users],
  );
  const allUserSet = useMemo(() => new Set(allUserIds), [allUserIds]);
  const visibleSelectedIds = useMemo(() => {
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (allUserSet.has(id)) next.add(id);
    }
    return next;
  }, [allUserSet, selectedIds]);
  const selectedCount = visibleSelectedIds.size;
  const selectedIdsCsv = Array.from(visibleSelectedIds).join(",");
  const isAllSelected = allUserIds.length > 0 && selectedCount === allUserIds.length;

  useEffect(() => {
    if (wasBulkPending.current && !bulkPending && !bulkState?.error) {
      queueMicrotask(() => {
        setSelectedIds(new Set());
        router.refresh();
      });
    }
    wasBulkPending.current = bulkPending;
  }, [bulkPending, bulkState, router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-lf-border bg-lf-surface px-4 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 lg:flex-nowrap">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SuperadminAddUserCard atlas={atlas} />
          <div
            className="hidden h-8 w-px shrink-0 bg-lf-border sm:block"
            aria-hidden
          />
          <SuperadminUsersExportBar payload={exportPayload} variant="inline" />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-lf-border pt-3 sm:ml-auto sm:border-t-0 sm:pt-0">
          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[13px] text-lf-text-secondary">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => {
                if (e.target.checked) setSelectedIds(new Set(allUserIds));
                else setSelectedIds(new Set());
              }}
              className="h-4 w-4 cursor-pointer rounded border-lf-border text-lf-text focus:ring-lf-brand focus:ring-offset-0"
            />
            <span className="whitespace-nowrap">Select all visible</span>
          </label>
          <span className="rounded-lg border border-lf-border bg-lf-bg/70 px-2.5 py-1 text-xs font-medium tabular-nums text-lf-text-secondary">
            Selected: {selectedCount}
          </span>
          <form
            action={bulkAction}
            className="inline-flex"
            onSubmit={(e) => {
              if (selectedCount === 0) {
                e.preventDefault();
                return;
              }
              const ok = window.confirm(
                `Delete ${selectedCount} selected user(s) permanently? This cannot be undone.`,
              );
              if (!ok) e.preventDefault();
            }}
          >
            <input type="hidden" name="userIdsCsv" value={selectedIdsCsv} />
            <button
              type="submit"
              disabled={bulkPending || selectedCount === 0}
              className="h-9 shrink-0 rounded-lg bg-lf-danger px-4 text-[13px] font-medium text-lf-on-accent transition-colors hover:bg-lf-danger/90 focus:outline-none focus:ring-2 focus:ring-lf-danger/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {bulkPending
                ? "Deleting..."
                : selectedCount > 0
                  ? `Delete (${selectedCount})`
                  : "Delete selected"}
            </button>
          </form>
        </div>
        {bulkState?.error ? (
          <p className="basis-full text-xs text-lf-danger" role="alert">
            {bulkState.error}
          </p>
        ) : null}
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-lf-border bg-lf-surface shadow-sm">
        <table className="w-full min-w-[1080px] border-collapse text-[13px]">
          <thead className="border-b border-lf-border bg-lf-bg/80">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted"> </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Email</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Name</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Role</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Manager / team</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Analyst team</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted">Password</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-muted"> </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="align-top border-b border-lf-divide text-[13px] text-lf-text-secondary transition-colors hover:bg-lf-row-hover last:border-b-0">
                <td className="px-4 py-3">
                  {isNonDeletable(u) ? (
                    <span className="text-xs text-lf-subtle">—</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={visibleSelectedIds.has(u.id)}
                      onChange={(e) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(u.id);
                          else next.delete(u.id);
                          return next;
                        });
                      }}
                      className="h-4 w-4 cursor-pointer rounded border-lf-border text-lf-text focus:ring-lf-brand focus:ring-offset-0"
                      aria-label={`Select ${u.email}`}
                    />
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-lf-text-secondary">
                  {u.email}
                </td>
                <td className="px-4 py-3 text-lf-text-secondary">{u.name}</td>
                <td className="px-4 py-3 text-lf-muted">
                  {superadminRoleLabel(u.role)}
                </td>
                <td className="px-4 py-3 text-lf-text-secondary">
                  {u.manager ? (
                    <span className="text-xs">
                      {u.manager.name}
                      <br />
                      <span className="text-lf-subtle">{u.manager.email}</span>
                    </span>
                  ) : u.team ? (
                    <span className="text-xs text-lf-muted">{u.team.name}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-lf-muted">
                  {u.analystTeamName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {u.role === UserRole.SUPERADMIN ? (
                    <span className="text-xs text-lf-subtle">—</span>
                  ) : (
                    <SuperadminPasswordForm
                      userId={u.id}
                      initialPassword={u.password}
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  {isNonDeletable(u) ? (
                    <span className="text-xs text-lf-subtle">—</span>
                  ) : (
                    <SuperadminDeleteForm userId={u.id} email={u.email} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
