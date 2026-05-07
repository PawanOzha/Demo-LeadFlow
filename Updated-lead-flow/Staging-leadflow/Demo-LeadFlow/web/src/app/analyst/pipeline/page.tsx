import { getSession } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db/pool";
import AnalystDateRangeBar from "@/components/analyst/analyst-date-range-bar";
import {
  analystRangeParams,
  analystRangeSummaryLabel,
  leadWhereSql,
  preservedSearchParamEntriesForDateBar,
} from "@/lib/analyst-date-range";
import { AnalystPipelineTableClient } from "@/components/portal-leads/analyst-pipeline-table-client";
import { QualificationStatus, SalesStage } from "@/lib/constants";
import { timedServerBlock } from "@/lib/server/log";
import { PortalSectionJumpTabs } from "@/components/portal-section-jump-tabs";

function first(sp: string | string[] | undefined): string | undefined {
  if (Array.isArray(sp)) return sp[0];
  return sp;
}

function sectionHref(
  sp: Record<string, string | string[] | undefined>,
  section: string,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const fv = first(v);
    if (!fv || k === "pipelineSection") continue;
    qs.set(k, fv);
  }
  qs.set("pipelineSection", section);
  return `/analyst/pipeline?${qs.toString()}`;
}

export default async function AnalystPipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const sectionRaw = first(sp.pipelineSection);
  const pipelineSection =
    sectionRaw === "qualified-table" ? "qualified-table" : "summary";
  const [preservedEntries, { from, to, q }] = await Promise.all([
    preservedSearchParamEntriesForDateBar(sp),
    analystRangeParams(sp),
  ]);
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const { clause, params } = leadWhereSql(session.id, from, to, q);

  const [summaryRows, qualified] = await timedServerBlock(
    "route:/analyst/pipeline page:queries",
    () =>
      Promise.all([
        dbQuery<{
          assigned: string;
          inProgress: string;
          won: string;
          lost: string;
        }>(
          `SELECT
             COUNT(*) FILTER (WHERE "qualificationStatus" = $${params.length + 1} AND "salesStage" = $${params.length + 2})::text AS "assigned",
             COUNT(*) FILTER (WHERE "qualificationStatus" = $${params.length + 1} AND "salesStage" = $${params.length + 3})::text AS "inProgress",
             COUNT(*) FILTER (WHERE "qualificationStatus" = $${params.length + 1} AND "salesStage" = $${params.length + 4})::text AS "won",
             COUNT(*) FILTER (WHERE "qualificationStatus" = $${params.length + 1} AND "salesStage" = $${params.length + 5})::text AS "lost"
           FROM "Lead"
           WHERE ${clause}`,
          [
            ...params,
            QualificationStatus.QUALIFIED,
            SalesStage.WITH_TEAM_LEAD,
            SalesStage.WITH_EXECUTIVE,
            SalesStage.CLOSED_WON,
            SalesStage.CLOSED_LOST,
          ],
        ),
        dbQuery<{
          qualificationStatus: string;
          salesStage: string;
          id: string;
          leadName: string;
          phone: string | null;
          source: string;
          notes: string | null;
          lostNotes: string | null;
          leadScore: number | null;
          createdAt: Date;
        }>(
          `SELECT
             "qualificationStatus",
             "salesStage",
             id,
             "leadName",
             phone,
             source,
             notes,
             "lostNotes",
             "leadScore",
             "createdAt"
           FROM "Lead"
           WHERE ${clause} AND "qualificationStatus" = $${params.length + 1}
           ORDER BY "createdAt" DESC`,
          [...params, QualificationStatus.QUALIFIED],
        ),
      ]),
  );
  const summary = summaryRows[0];
  const assigned = Number(summary?.assigned ?? 0);
  const inProgress = Number(summary?.inProgress ?? 0);
  const won = Number(summary?.won ?? 0);
  const lost = Number(summary?.lost ?? 0);

  const qualifiedRows = qualified.map((l) => ({
    id: l.id,
    leadName: l.leadName,
    phone: l.phone,
    source: l.source,
    notes: l.notes,
    lostNotes: l.lostNotes,
    qualificationStatus: l.qualificationStatus,
    salesStage: l.salesStage,
    leadScore: l.leadScore,
    createdAt: l.createdAt.toISOString(),
  }));
  const tabs = [
    { id: "summary", label: "Summary", href: sectionHref(sp, "summary") },
    {
      id: "qualified-table",
      label: "Qualified table",
      href: sectionHref(sp, "qualified-table"),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PortalSectionJumpTabs tabs={tabs} activeId={pipelineSection} />
        <div className="w-full max-w-[28rem]">
          <AnalystDateRangeBar
            key={`${from ?? ""}|${to ?? ""}`}
            pathname="/analyst/pipeline"
            defaultFrom={from ?? ""}
            defaultTo={to ?? ""}
            preservedEntries={preservedEntries}
            rangeSummary={rangeLabel}
            compact
          />
        </div>
      </div>

      {pipelineSection === "summary" ? (
        <>
          <div className="flex gap-3 rounded-xl border border-lf-accent/30 bg-lf-accent/10 px-4 py-3 text-sm text-lf-link">
            <span className="shrink-0 font-bold text-lf-link" aria-hidden>
              ⓘ
            </span>
            <p>
              You can see outcome statuses for privacy — sales executive names and
              call details are not shown here. For closed lost, Notes shows the
              executive’s loss reason when recorded.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Assigned", assigned, "text-lf-warning"],
                ["In progress", inProgress, "text-lf-accent"],
                ["Closed won", won, "text-lf-success"],
                ["Closed lost", lost, "text-lf-danger"],
              ] as const
            ).map(([label, val, color]) => (
              <div
                key={label}
                className="rounded-2xl border border-lf-border bg-lf-surface p-5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
                  {label}
                </p>
                <p className={`mt-2 text-3xl font-bold tabular-nums ${color}`}>
                  {val}
                </p>
              </div>
            ))}
          </section>
        </>
      ) : (
        <AnalystPipelineTableClient
          key={`${from ?? ""}|${to ?? ""}`}
          qualified={qualifiedRows}
          initialQ={q}
          from={from}
          to={to}
        />
      )}
    </div>
  );
}
