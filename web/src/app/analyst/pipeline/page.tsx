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

export default async function AnalystPipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const [preservedEntries, { from, to, q }] = await Promise.all([
    preservedSearchParamEntriesForDateBar(sp),
    analystRangeParams(sp),
  ]);
  const rangeLabel = analystRangeSummaryLabel(from, to);
  const { clause, params } = leadWhereSql(session.id, from, to);

  const leads = await timedServerBlock("route:/analyst/pipeline page:queries", () =>
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
    }>(`SELECT * FROM "Lead" WHERE ${clause} ORDER BY "createdAt" DESC`, params),
  );

  const qualified = leads.filter(
    (l) => l.qualificationStatus === QualificationStatus.QUALIFIED,
  );

  const assigned = qualified.filter(
    (l) => l.salesStage === SalesStage.WITH_TEAM_LEAD,
  ).length;
  const inProgress = qualified.filter(
    (l) => l.salesStage === SalesStage.WITH_EXECUTIVE,
  ).length;
  const won = qualified.filter(
    (l) => l.salesStage === SalesStage.CLOSED_WON,
  ).length;
  const lost = qualified.filter(
    (l) => l.salesStage === SalesStage.CLOSED_LOST,
  ).length;

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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">
          Pipeline status
        </h1>
      </header>

      <AnalystDateRangeBar
        key={`${from ?? ""}|${to ?? ""}`}
        pathname="/analyst/pipeline"
        defaultFrom={from ?? ""}
        defaultTo={to ?? ""}
        preservedEntries={preservedEntries}
        rangeSummary={rangeLabel}
      />

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

      <AnalystPipelineTableClient
        key={`${from ?? ""}|${to ?? ""}`}
        qualified={qualifiedRows}
        initialQ={q}
        from={from}
        to={to}
      />
    </div>
  );
}
