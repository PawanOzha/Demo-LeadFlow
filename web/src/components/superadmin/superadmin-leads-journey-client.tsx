"use client";

import Link from "next/link";
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
import type { DashboardExportPayload } from "@/lib/dashboard-export-types";
import { DashboardReportExport } from "@/components/dashboard-report-export";
import AnalystNotesReadonly from "@/components/analyst-notes-readonly";
import ExecLostNotesReadonly from "@/components/exec-lost-notes-readonly";

export type SuperadminLeadsPaginationChrome = {
  totalCount: number;
  offset: number;
  perPage: number;
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
};

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

export function SuperadminLeadsJourneyClient({
  analystGroups,
  pagination,
  exportPayload,
  exportDescription,
}: {
  analystGroups: AnalystGroup[];
  pagination: SuperadminLeadsPaginationChrome;
  exportPayload: DashboardExportPayload;
  exportDescription?: string;
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

  const pg = pagination;

  return (
    <>
      {/*
        Avoid overflow-hidden on this outer card: it stacks with overflow-x-auto inside <main>
        and body background-attachment:fixed and can make the bottom of the section look clipped.
        Horizontal clipping stays on the inner table wrapper only.
      */}
      <div className="min-w-0 w-full rounded-2xl border border-lf-border bg-lf-surface shadow-sm ring-1 ring-black/[0.04]">
        <div className="border-b border-lf-border/80 bg-gradient-to-b from-lf-bg/[0.45] to-lf-bg/[0.12]">
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-3 py-2.5 sm:gap-x-4 sm:px-4 lg:px-5 lg:py-3"
            title={exportDescription ?? undefined}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3">
              <p className="whitespace-nowrap text-[13px] text-lf-subtle">
                <span className="tabular-nums text-lf-text">
                  {pg.totalCount === 0 ? 0 : pg.offset + 1}–
                  {Math.min(pg.offset + pg.perPage, pg.totalCount)}
                </span>
                <span className="mx-1 text-lf-muted">of</span>
                <span className="tabular-nums font-semibold text-lf-text">
                  {pg.totalCount}
                </span>
                <span className="ml-1 text-lf-muted">leads</span>
              </p>
              <span
                className="hidden h-5 w-px shrink-0 bg-lf-border sm:block"
                aria-hidden
              />
              <div className="flex flex-wrap items-center gap-1">
                {pg.prevHref ? (
                  <Link
                    replace
                    href={pg.prevHref}
                    className="inline-flex h-8 items-center rounded-lg border border-lf-border bg-lf-surface px-3 text-[12px] font-medium text-lf-text-secondary shadow-sm transition-colors hover:bg-lf-row-hover sm:h-9 sm:px-3.5 sm:text-[13px]"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex h-8 cursor-not-allowed items-center rounded-lg border border-lf-border px-3 text-[12px] text-lf-subtle opacity-45 sm:h-9 sm:px-3.5 sm:text-[13px]">
                    Previous
                  </span>
                )}
                <span className="px-1 text-[11px] tabular-nums text-lf-muted">
                  Page {Math.min(pg.page, pg.totalPages)} of {pg.totalPages}
                </span>
                {pg.nextHref ? (
                  <Link
                    replace
                    href={pg.nextHref}
                    className="inline-flex h-8 items-center rounded-lg border border-lf-border bg-lf-surface px-3 text-[12px] font-medium text-lf-text-secondary shadow-sm transition-colors hover:bg-lf-row-hover sm:h-9 sm:px-3.5 sm:text-[13px]"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="inline-flex h-8 cursor-not-allowed items-center rounded-lg border border-lf-border px-3 text-[12px] text-lf-subtle opacity-45 sm:h-9 sm:px-3.5 sm:text-[13px]">
                    Next
                  </span>
                )}
              </div>
            </div>

            <span
              className="hidden h-5 w-px shrink-0 bg-lf-border/90 lg:block"
              aria-hidden
            />

            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2 lg:gap-x-4">
              <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-[12px] text-lf-text-secondary sm:text-[13px]">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(allLeadIds));
                    else setSelectedIds(new Set());
                  }}
                  className="h-4 w-4 rounded border-lf-border"
                />
                <span className="hidden sm:inline">Select all visible</span>
                <span className="sm:hidden">Select all</span>
              </label>
              <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-[12px] text-lf-text-secondary sm:text-[13px]">
                <input
                  type="checkbox"
                  checked={showDealValueColumns}
                  onChange={(e) =>
                    setShowDealValueColumns(e.target.checked)
                  }
                  className="h-4 w-4 rounded border-lf-border"
                />
                <span className="hidden sm:inline">Deal value columns</span>
                <span className="sm:hidden">Deal $</span>
              </label>
              <span className="rounded-md border border-lf-border/90 bg-lf-surface px-2 py-0.5 text-[11px] font-medium tabular-nums text-lf-text-secondary">
                Selected {selectedCount}
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
                className="flex items-center"
              >
                <input type="hidden" name="leadIdsCsv" value={selectedIdsCsv} />
                <button
                  type="submit"
                  disabled={bulkPending || selectedCount === 0}
                  className="h-8 rounded-lg bg-lf-danger px-2.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-lf-danger/90 disabled:cursor-not-allowed disabled:opacity-55 sm:h-9 sm:px-3"
                >
                  {bulkPending
                    ? "Deleting..."
                    : selectedCount > 0
                      ? `Delete (${selectedCount})`
                      : "Delete"}
                </button>
              </form>
              <div className="flex shrink-0 items-center border-l border-lf-border/70 pl-3 lg:pl-4">
                <DashboardReportExport payload={exportPayload} />
              </div>
            </div>
          </div>
          {bulkState?.error ? (
            <p
              className="border-t border-lf-border/60 bg-lf-danger/[0.06] px-4 py-2 text-xs text-lf-danger lg:px-5"
              role="alert"
            >
              {bulkState.error}
            </p>
          ) : null}
        </div>

        {analystGroups.length === 0 ? (
          <div className="border-t border-lf-border bg-lf-surface px-4 py-14 text-center lg:px-6">
            <p className="text-[15px] font-medium text-lf-text">
              No leads match these filters
            </p>
            <p className="mt-1.5 text-[13px] text-lf-muted">
              Adjust filters or date range, then try again.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-lf-border">
            {analystGroups.map(({ analyst, leads }) => (
              <section key={analyst.id}>
                <div className="overflow-x-auto bg-lf-surface/95">
              <table
                className={`w-full table-fixed border-collapse text-[13px] leading-snug ${showDealValueColumns ? "min-w-[1680px]" : "min-w-[1480px]"}`}
              >
                <thead className="border-b border-lf-border bg-lf-bg/70 text-left text-[11px] font-semibold uppercase tracking-wide text-lf-subtle">
                  <tr>
                    <th className="w-9 px-2 py-2 text-center align-middle">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="w-[200px] px-3 py-2 align-bottom">Lead</th>
                    <th className="w-[188px] px-3 py-2 align-bottom">Contact</th>
                    <th className="w-[200px] px-3 py-2 align-bottom">Source</th>
                    <th className="w-[104px] px-3 py-2 align-bottom">Status</th>
                    <th className="w-[128px] px-3 py-2 align-bottom">Stage</th>
                    {showDealValueColumns ? (
                      <>
                        <th className="w-[108px] px-3 py-2 text-right align-bottom tabular-nums">
                          Est. value
                        </th>
                        <th className="w-[108px] px-3 py-2 text-right align-bottom tabular-nums">
                          Closed revenue
                        </th>
                      </>
                    ) : null}
                    <th className="min-w-[11rem] max-w-[28rem] px-3 py-2 align-bottom">
                      Your notes
                    </th>
                    <th className="min-w-[9rem] max-w-[20rem] px-3 py-2 align-bottom">
                      Executive notes
                    </th>
                    <th className="w-[116px] px-3 py-2 align-bottom">Team</th>
                    <th className="w-[148px] px-3 py-2 align-bottom">
                      Sales executive
                    </th>
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
                      className="cursor-pointer text-lf-text-secondary transition odd:bg-lf-bg/[0.16] hover:bg-lf-bg/[0.28] focus:outline-none focus:ring-2 focus:ring-lf-brand/30"
                    >
                      <td className="px-2 py-2 align-middle text-center">
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
                      <td className="px-3 py-2 align-top">
                        <span className="font-semibold text-lf-text">
                          {lead.leadName || "Unnamed lead"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[12px] text-lf-text-secondary">
                        <div className="flex flex-col gap-0.5">
                          <span className="block whitespace-nowrap">
                            {lead.phone || "—"}
                          </span>
                          <span className="block truncate" title={lead.leadEmail ?? undefined}>
                            {lead.leadEmail || "—"}
                          </span>
                          <span className="block text-[11px] text-lf-subtle">
                            {lead.city || "—"}, {lead.country || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <LeadSourcePill source={lead.source} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPillClass(
                            lead.qualificationStatus,
                          )}`}
                        >
                          {lead.qualificationStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[12px]">
                        {analystFacingSalesLabel(lead.salesStage)}
                      </td>
                      {showDealValueColumns ? (
                        <>
                          <td className="px-3 py-2 align-top text-right text-[12px] tabular-nums text-lf-text-secondary">
                            {formatDealMoney(
                              lead.estimatedDealValue,
                              lead.dealCurrency,
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-right text-[12px] tabular-nums text-lf-text-secondary">
                            {formatDealMoney(
                              lead.closedRevenue,
                              lead.dealCurrency,
                            )}
                          </td>
                        </>
                      ) : null}
                      <td
                        className="max-w-[28rem] min-w-0 px-3 py-2 align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AnalystNotesReadonly notes={lead.notes} />
                      </td>
                      <td
                        className="max-w-[280px] min-w-0 px-3 py-2 align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExecLostNotesReadonly notes={lead.lostNotes} />
                      </td>
                      <td className="px-3 py-2 align-top text-[12px]">
                        <span className="block min-w-0 truncate" title={lead.team?.name ?? undefined}>
                          {lead.team?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[12px]">
                        <span
                          className="block min-w-0 truncate"
                          title={lead.assignedSalesExec?.name ?? undefined}
                        >
                          {lead.assignedSalesExec?.name ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              </section>
            ))}
          </div>
        )}
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
