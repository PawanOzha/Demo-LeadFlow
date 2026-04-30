"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  superadminDeleteLeadFormAction,
  superadminDeleteLeadsBulkFormAction,
} from "@/app/actions/superadmin";
import { LeadHandoffAction, QualificationStatus } from "@/lib/constants";
import { analystFacingSalesLabel } from "@/lib/sales-stage-labels";
import { LeadSourceDisplay, LeadSourcePill } from "@/components/lead-source-display";
import {
  superadminHandoffLabels,
  superadminRoleLabel,
} from "@/lib/superadmin-ui";
import { formatDealMoney } from "@/lib/deal-money";

type JourneyLog = {
  id: string;
  createdAt: string;
  action: string;
  detail: string | null;
  actor: { name: string; email: string; role: string } | null;
};

type JourneyLead = {
  id: string;
  leadName: string;
  phone: string | null;
  leadEmail: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
  updatedAt: string;
  qualificationStatus: string;
  source: string;
  sourceWebsiteName: string | null;
  sourceMetaProfileName: string | null;
  notes: string | null;
  lostNotes: string | null;
  leadScore: number | null;
  salesStage: string;
  execAssignedAt: string | null;
  execDeadlineAt: string | null;
  closedAt: string | null;
  internalReassignCount: number;
  assignedMainTeamLead: { name: string; email: string } | null;
  team: { name: string } | null;
  assignedSalesExec: { name: string; email: string } | null;
  duplicateMeta: {
    byPhone: boolean;
    maxGroupSize: number;
  } | null;
  handoffLogs: JourneyLog[];
  estimatedDealValue: number | null;
  closedRevenue: number | null;
  dealCurrency: string;
};

type AnalystGroup = {
  analyst: { id: string; name: string; email: string };
  leads: JourneyLead[];
};

function fmtDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function statusPillClass(status: string) {
  if (status === QualificationStatus.QUALIFIED) {
    return "bg-lf-success/15 text-lf-success";
  }
  if (status === QualificationStatus.NOT_QUALIFIED) {
    return "bg-lf-warning/15 text-lf-warning";
  }
  return "bg-lf-bg/60 text-lf-text-secondary";
}

function findSelectedLead(
  analystGroups: AnalystGroup[],
  selectedLeadId: string | null,
): { lead: JourneyLead; analyst: AnalystGroup["analyst"] } | null {
  if (!selectedLeadId) return null;
  for (const group of analystGroups) {
    const lead = group.leads.find((l) => l.id === selectedLeadId);
    if (lead) return { lead, analyst: group.analyst };
  }
  return null;
}

function buildJourneyTimeline(selected: {
  lead: JourneyLead;
  analyst: AnalystGroup["analyst"];
}) {
  let routedToMainTeamAt: string | null = null;
  let assignedToExecutiveAt: string | null = null;
  let directAssignedToExecutiveByAtlAt: string | null = null;
  for (const h of selected.lead.handoffLogs) {
    if (
      h.action === LeadHandoffAction.ROUTED_TO_MAIN_TEAM &&
      !routedToMainTeamAt
    ) {
      routedToMainTeamAt = h.createdAt;
    } else if (
      h.action === LeadHandoffAction.ASSIGNED_TO_EXECUTIVE &&
      !assignedToExecutiveAt
    ) {
      assignedToExecutiveAt = h.createdAt;
    } else if (
      h.action === LeadHandoffAction.DIRECT_ASSIGNED_TO_EXECUTIVE_BY_ATL &&
      !directAssignedToExecutiveByAtlAt
    ) {
      directAssignedToExecutiveByAtlAt = h.createdAt;
    }
  }
  return {
    routedToMainTeamAt,
    assignedToExecutiveAt,
    directAssignedToExecutiveByAtlAt,
  };
}

function fmtGap(fromIso: string | null, toIso: string | null) {
  if (!fromIso || !toIso) return "—";
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return "—";
  const mins = Math.floor((to - from) / 60000);
  const days = Math.floor(mins / (60 * 24));
  const hours = Math.floor((mins % (60 * 24)) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function duplicateLabel(meta: JourneyLead["duplicateMeta"]) {
  if (!meta) return null;
  if (meta.byPhone) return `Duplicate phone (${meta.maxGroupSize})`;
  return null;
}

export function SuperadminLeadsJourneyClient({
  analystGroups,
}: {
  analystGroups: AnalystGroup[];
}) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDealValueColumns, setShowDealValueColumns] = useState(true);
  const [singleState, singleFormAction, singlePending] = useActionState(
    superadminDeleteLeadFormAction,
    undefined,
  );
  const [bulkState, bulkFormAction, bulkPending] = useActionState(
    superadminDeleteLeadsBulkFormAction,
    undefined,
  );
  const wasSinglePending = useRef(false);
  const wasBulkPending = useRef(false);
  const allLeadIds = useMemo(
    () => analystGroups.flatMap((g) => g.leads.map((l) => l.id)),
    [analystGroups],
  );
  const allLeadIdSet = useMemo(() => new Set(allLeadIds), [allLeadIds]);
  const visibleSelectedIds = useMemo(() => {
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (allLeadIdSet.has(id)) next.add(id);
    }
    return next;
  }, [allLeadIdSet, selectedIds]);
  const selectedCount = visibleSelectedIds.size;

  const selected = findSelectedLead(analystGroups, selectedLeadId);
  const timeline = selected ? buildJourneyTimeline(selected) : null;

  const closeModal = () => {
    if (singlePending) return;
    setSelectedLeadId(null);
  };

  useEffect(() => {
    if (wasSinglePending.current && !singlePending && !singleState?.error) {
      queueMicrotask(() => {
        setSelectedLeadId(null);
        setSelectedIds(new Set());
        router.refresh();
      });
    }
    wasSinglePending.current = singlePending;
  }, [router, singlePending, singleState]);

  useEffect(() => {
    if (wasBulkPending.current && !bulkPending && !bulkState?.error) {
      queueMicrotask(() => {
        setSelectedLeadId(null);
        setSelectedIds(new Set());
        router.refresh();
      });
    }
    wasBulkPending.current = bulkPending;
  }, [bulkPending, bulkState, router]);

  const openLead = (leadId: string) => setSelectedLeadId(leadId);
  const isAllSelected = allLeadIds.length > 0 && selectedCount === allLeadIds.length;
  const selectedIdsCsv = Array.from(visibleSelectedIds).join(",");

  return (
    <>
      <div className="space-y-8">
        <div className="rounded-2xl border border-lf-border bg-gradient-to-b from-lf-surface to-lf-bg p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-lf-text-secondary">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(allLeadIds));
                    else setSelectedIds(new Set());
                  }}
                  className="h-4 w-4 rounded border-lf-border"
                />
                Select all visible leads
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-lf-text-secondary">
                <input
                  type="checkbox"
                  checked={showDealValueColumns}
                  onChange={(e) => setShowDealValueColumns(e.target.checked)}
                  className="h-4 w-4 rounded border-lf-border"
                />
                Show deal value columns
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-lf-border bg-lf-bg/70 px-2.5 py-1 text-xs font-medium text-lf-text-secondary">
                Selected: {selectedCount}
              </span>
              <form
                action={bulkFormAction}
                onSubmit={(e) => {
                  if (selectedCount === 0) {
                    e.preventDefault();
                    return;
                  }
                  const ok = window.confirm(
                    `Delete ${selectedCount} selected lead(s) permanently? This cannot be undone.`,
                  );
                  if (!ok) e.preventDefault();
                }}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="leadIdsCsv" value={selectedIdsCsv} />
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

        {analystGroups.map(({ analyst, leads }) => (
          <section key={analyst.id} className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-lf-border bg-lf-surface/90 shadow-sm">
              <table className="min-w-[1480px] w-full table-fixed divide-y divide-lf-border text-sm">
                <thead className="bg-lf-bg/70 text-left text-xs uppercase tracking-wide text-lf-subtle">
                  <tr>
                    <th className="w-[44px] px-4 py-3 font-semibold">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="w-[240px] px-4 py-3 font-semibold">Lead</th>
                    <th className="w-[210px] px-4 py-3 font-semibold">Contact</th>
                    <th className="w-[240px] px-4 py-3 font-semibold">Source</th>
                    <th className="w-[170px] px-4 py-3 font-semibold">Duplicate check</th>
                    <th className="w-[120px] px-4 py-3 font-semibold">Status</th>
                    <th className="w-[150px] px-4 py-3 font-semibold">Stage</th>
                    {showDealValueColumns ? (
                      <>
                        <th className="w-[120px] px-4 py-3 font-semibold">
                          Est. value
                        </th>
                        <th className="w-[120px] px-4 py-3 font-semibold">
                          Closed revenue
                        </th>
                      </>
                    ) : null}
                    <th className="w-[130px] px-4 py-3 font-semibold">Team</th>
                    <th className="w-[160px] px-4 py-3 font-semibold">Sales executive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lf-border">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openLead(lead.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openLead(lead.id);
                        }
                      }}
                      className="cursor-pointer align-top text-lf-text-secondary transition odd:bg-lf-bg/[0.16] hover:bg-lf-bg/[0.28] focus:outline-none focus:ring-2 focus:ring-lf-brand/30"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={visibleSelectedIds.has(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(lead.id);
                              else next.delete(lead.id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-lf-border"
                          aria-label={`Select ${lead.leadName || "lead"}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-lf-text">
                          {lead.leadName || "Unnamed lead"}
                        </p>
                        <p className="mt-1 text-xs text-lf-subtle">
                          Created {fmtDateTime(lead.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-lf-text-secondary">
                        <p>{lead.phone || "—"}</p>
                        <p className="mt-1 truncate">{lead.leadEmail || "—"}</p>
                        <p className="mt-1 text-lf-subtle">
                          {lead.city || "—"}, {lead.country || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <LeadSourcePill source={lead.source} />
                      </td>
                      <td className="px-4 py-3">
                        {duplicateLabel(lead.duplicateMeta) ? (
                          <span className="inline-flex rounded-full bg-lf-warning/15 px-2.5 py-1 text-[11px] font-semibold text-lf-warning">
                            {duplicateLabel(lead.duplicateMeta)}
                          </span>
                        ) : (
                          <span className="text-xs text-lf-subtle">No duplicate match</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusPillClass(
                            lead.qualificationStatus,
                          )}`}
                        >
                          {lead.qualificationStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {analystFacingSalesLabel(lead.salesStage)}
                      </td>
                      {showDealValueColumns ? (
                        <>
                          <td className="px-4 py-3 text-xs tabular-nums text-lf-text-secondary">
                            {formatDealMoney(
                              lead.estimatedDealValue,
                              lead.dealCurrency,
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums text-lf-text-secondary">
                            {formatDealMoney(
                              lead.closedRevenue,
                              lead.dealCurrency,
                            )}
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3">{lead.team?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        {lead.assignedSalesExec?.name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[5vh] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="superadmin-lead-journey-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-lf-border bg-lf-surface p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-lf-border pb-4">
              <div>
                <h2
                  id="superadmin-lead-journey-title"
                  className="text-2xl font-semibold text-lf-text"
                >
                  {selected.lead.leadName || "Unnamed lead"}
                </h2>
                <p className="mt-1 text-sm text-lf-subtle">
                  Created {fmtDateTime(selected.lead.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPillClass(
                    selected.lead.qualificationStatus,
                  )}`}
                >
                  {selected.lead.qualificationStatus.replace(/_/g, " ")}
                </span>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-1.5 text-lf-subtle hover:bg-lf-bg/50 hover:text-lf-text"
                  aria-label="Close"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <dl className="mb-6 grid gap-x-6 gap-y-2 text-sm text-lf-muted sm:grid-cols-[10rem_1fr]">
              <dt>Lead analyst</dt>
              <dd className="text-lf-text-secondary">
                {selected.analyst.name} ({selected.analyst.email})
              </dd>
              <dt>Phone</dt>
              <dd className="text-lf-text-secondary">
                {selected.lead.phone || "—"}
              </dd>
              <dt>Email</dt>
              <dd className="text-lf-text-secondary">
                {selected.lead.leadEmail || "—"}
              </dd>
              <dt>Country / City</dt>
              <dd className="text-lf-text-secondary">
                {selected.lead.country || "—"} / {selected.lead.city || "—"}
              </dd>
              <dt>Source</dt>
              <dd className="text-lf-text-secondary">
                <LeadSourceDisplay source={selected.lead.source} />
              </dd>
              <dt>Source metadata</dt>
              <dd className="text-lf-text-secondary">
                Website: {selected.lead.sourceWebsiteName || "—"}; Meta profile:{" "}
                {selected.lead.sourceMetaProfileName || "—"}
              </dd>
              <dt>Stage</dt>
              <dd className="text-lf-text-secondary">
                {analystFacingSalesLabel(selected.lead.salesStage)}
              </dd>
              <dt>Lead score</dt>
              <dd className="text-lf-text-secondary">
                {selected.lead.leadScore ?? "—"}
              </dd>
              <dt>Pipeline estimate</dt>
              <dd className="text-lf-text-secondary">
                {formatDealMoney(
                  selected.lead.estimatedDealValue,
                  selected.lead.dealCurrency,
                )}
              </dd>
              <dt>Closed revenue</dt>
              <dd className="text-lf-text-secondary">
                {formatDealMoney(
                  selected.lead.closedRevenue,
                  selected.lead.dealCurrency,
                )}
              </dd>
              <dt>Deal currency</dt>
              <dd className="text-lf-text-secondary">
                {selected.lead.dealCurrency || "USD"}
              </dd>
              <dt>Main team lead</dt>
              <dd className="text-lf-text-secondary">
                {selected.lead.assignedMainTeamLead?.name ?? "—"}
              </dd>
              <dt>Team</dt>
              <dd className="text-lf-text-secondary">
                {selected.lead.team?.name ?? "—"}
              </dd>
              <dt>Sales executive</dt>
              <dd className="text-lf-text-secondary">
                {selected.lead.assignedSalesExec?.name ?? "—"}
              </dd>
              <dt>Exec assigned / deadline</dt>
              <dd className="text-lf-text-secondary">
                {fmtDateTime(selected.lead.execAssignedAt)} /{" "}
                {fmtDateTime(selected.lead.execDeadlineAt)}
              </dd>
              <dt>Closed at</dt>
              <dd className="text-lf-text-secondary">
                {fmtDateTime(selected.lead.closedAt)}
              </dd>
              <dt>Reassign count</dt>
              <dd className="text-lf-text-secondary">
                {selected.lead.internalReassignCount}
              </dd>
              <dt>Updated at</dt>
              <dd className="text-lf-text-secondary">
                {fmtDateTime(selected.lead.updatedAt)}
              </dd>
              <dt>Duplicate check</dt>
              <dd className="text-lf-text-secondary">
                {duplicateLabel(selected.lead.duplicateMeta) ?? "No duplicate match"}
              </dd>
              <dt>Analyst notes</dt>
              <dd className="text-lf-text-secondary whitespace-pre-wrap">
                {selected.lead.notes || "—"}
              </dd>
              <dt>Executive notes</dt>
              <dd className="text-lf-text-secondary whitespace-pre-wrap">
                {selected.lead.lostNotes || "—"}
              </dd>
            </dl>

            <div className="border-t border-lf-border pt-4">
              {timeline ? (
                <div className="mb-4 rounded-lg border border-lf-border bg-lf-bg/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-lf-subtle">
                    Pass timeline / gap
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-lf-text-secondary">
                    <p>
                      <span className="text-lf-subtle">Lead analyst: </span>
                      {fmtDateTime(selected.lead.createdAt)}
                    </p>
                    <p>
                      <span className="text-lf-subtle">ATL pass: </span>
                      {fmtDateTime(
                        timeline.directAssignedToExecutiveByAtlAt ??
                          timeline.routedToMainTeamAt,
                      )}
                    </p>
                    <p>
                      <span className="text-lf-subtle">Main TL pass: </span>
                      {timeline.directAssignedToExecutiveByAtlAt
                        ? "— (direct ATL→SE)"
                        : fmtDateTime(timeline.assignedToExecutiveAt)}
                    </p>
                    <p>
                      <span className="text-lf-subtle">Sales executive: </span>
                      {fmtDateTime(
                        timeline.assignedToExecutiveAt ??
                          timeline.directAssignedToExecutiveByAtlAt,
                      )}
                    </p>
                  </div>
                  <div className="mt-2 border-t border-lf-border pt-2 text-[11px] text-lf-muted">
                    <p>
                      LA → ATL:{" "}
                      {fmtGap(
                        selected.lead.createdAt,
                        timeline.directAssignedToExecutiveByAtlAt ??
                          timeline.routedToMainTeamAt,
                      )}
                    </p>
                    <p>
                      ATL → Main TL:{" "}
                      {timeline.directAssignedToExecutiveByAtlAt
                        ? "Skipped (direct ATL→SE)"
                        : "Instant at routing"}
                    </p>
                    <p>
                      Main TL → SE:{" "}
                      {timeline.directAssignedToExecutiveByAtlAt
                        ? "Direct by ATL"
                        : fmtGap(
                            timeline.routedToMainTeamAt,
                            timeline.assignedToExecutiveAt,
                          )}
                    </p>
                  </div>
                </div>
              ) : null}
              <p className="text-sm font-semibold uppercase tracking-wide text-lf-subtle">
                Journey
              </p>
              {selected.lead.handoffLogs.length === 0 ? (
                <p className="mt-2 text-sm text-lf-subtle">
                  No handoff events recorded (older leads or pre-log).
                </p>
              ) : (
                <ol className="mt-4 space-y-4">
                  {selected.lead.handoffLogs.map((h) => (
                    <li
                      key={h.id}
                      className="relative border-l border-lf-border pl-5 text-sm"
                    >
                      <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-lf-muted" />
                      <p className="text-lf-subtle">{fmtDateTime(h.createdAt)}</p>
                      <p className="mt-0.5 font-semibold text-lf-text-secondary">
                        {superadminHandoffLabels[h.action] ?? h.action}
                      </p>
                      {h.actor ? (
                        <p className="mt-0.5 text-lf-subtle">
                          {h.actor.name} · {superadminRoleLabel(h.actor.role)}
                        </p>
                      ) : null}
                      {h.detail ? <p className="mt-1 text-lf-subtle">{h.detail}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-lf-border pt-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-lf-border px-4 py-2 text-sm font-medium text-lf-text-secondary hover:bg-lf-bg/60"
              >
                Close
              </button>
              <form
                action={singleFormAction}
                onSubmit={(e) => {
                  const ok = window.confirm(
                    "Delete this lead permanently? This cannot be undone.",
                  );
                  if (!ok) e.preventDefault();
                }}
              >
                <input type="hidden" name="leadId" value={selected.lead.id} />
                <button
                  type="submit"
                  disabled={singlePending}
                  className="rounded-lg bg-lf-danger px-4 py-2 text-sm font-semibold text-white hover:bg-lf-danger/90 disabled:opacity-60"
                >
                  {singlePending ? "Deleting..." : "Delete lead"}
                </button>
                {singleState?.error ? (
                  <p className="mt-2 text-xs text-lf-danger" role="alert">
                    {singleState.error}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
