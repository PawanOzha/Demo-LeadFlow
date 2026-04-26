"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { superadminDeleteUsersBulkFormAction } from "@/app/actions/superadmin";
import { SuperadminDeleteForm } from "@/components/superadmin/superadmin-delete-form";
import { SuperadminPasswordForm } from "@/components/superadmin/superadmin-password-form";
import { UserRole } from "@/lib/constants";
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

export function SuperadminUsersTableClient({
  users,
}: {
  users: UserRow[];
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
      <div className="rounded-2xl border border-lf-border bg-gradient-to-b from-lf-surface to-lf-bg p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-lf-text-secondary">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => {
                if (e.target.checked) setSelectedIds(new Set(allUserIds));
                else setSelectedIds(new Set());
              }}
              className="h-4 w-4 rounded border-lf-border"
            />
            Select all visible users
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-lf-border bg-lf-bg/70 px-2.5 py-1 text-xs font-medium text-lf-text-secondary">
              Selected: {selectedCount}
            </span>
            <form
              action={bulkAction}
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
                className="rounded-lg bg-lf-danger px-3 py-2 text-xs font-semibold text-white hover:bg-lf-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkPending
                  ? "Deleting..."
                  : selectedCount > 0
                    ? `Delete selected (${selectedCount})`
                    : "Delete selected"}
              </button>
            </form>
          </div>
        </div>
        {bulkState?.error ? (
          <p className="mt-2 text-xs text-lf-danger" role="alert">
            {bulkState.error}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-lf-border">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-lf-border bg-lf-bg/90 text-xs uppercase tracking-wide text-lf-subtle">
            <tr>
              <th className="px-4 py-3 font-medium"> </th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Manager / team</th>
              <th className="px-4 py-3 font-medium">Analyst team</th>
              <th className="px-4 py-3 font-medium">Password</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lf-divide">
            {users.map((u) => (
              <tr key={u.id} className="align-top">
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
                      className="h-4 w-4 rounded border-lf-border"
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
