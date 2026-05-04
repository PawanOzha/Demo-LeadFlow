"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QualificationStatus } from "@/lib/constants";
import { normalizeYmdOrNull } from "@/lib/analyst-date-range";
import type { SuperadminLeadsParsed, SuperadminLeadsStatus } from "@/lib/superadmin-leads-filters";

type TeamOpt = { id: string; name: string };
type ExecOpt = { id: string; name: string; email: string };
type AnalystOpt = { id: string; name: string; email: string };

/**
 * Merges into the current URL and `router.replace`s after a short debounce so
 * filters reach the server without Apply/Reset buttons.
 */
export function SuperadminLeadsFiltersBar({
  initial,
  analysts,
  teams,
  execs,
}: {
  initial: SuperadminLeadsParsed;
  analysts: AnalystOpt[];
  teams: TeamOpt[];
  execs: ExecOpt[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [q, setQ] = useState(initial.q ?? "");
  const [status, setStatus] = useState<SuperadminLeadsStatus>(initial.status);
  const [analystId, setAnalystId] = useState(initial.analystId ?? "");
  const [teamId, setTeamId] = useState(initial.teamId ?? "");
  const [execId, setExecId] = useState(initial.execId ?? "");
  const [perPage, setPerPage] = useState<25 | 50 | 100>(initial.perPage);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const hydrated = useRef(false);

  const nextHref = useMemo(() => {
    const p = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search.slice(1) : "",
    );
    p.delete("duplicatePhonesOnly");

    const setOrDel = (k: string, v: string) => {
      if (v) p.set(k, v);
      else p.delete(k);
    };

    let fromN = normalizeYmdOrNull(from.trim()) ?? "";
    let toN = normalizeYmdOrNull(to.trim()) ?? "";
    if (fromN && toN && fromN > toN) {
      const t = fromN;
      fromN = toN;
      toN = t;
    }
    setOrDel("from", fromN);
    setOrDel("to", toN);

    p.set("status", status);
    setOrDel("q", q.trim().slice(0, 200));
    setOrDel("analystId", analystId.trim());
    setOrDel("teamId", teamId.trim());
    setOrDel("execId", execId.trim());
    p.set("perPage", String(perPage));
    p.set("page", "1");
    p.delete("dateBasis");
    p.delete("scope");

    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [
    analystId,
    execId,
    from,
    pathname,
    perPage,
    q,
    status,
    teamId,
    to,
  ]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const timer = setTimeout(() => {
      router.replace(nextHref);
    }, 300);
    return () => clearTimeout(timer);
  }, [nextHref, router]);

  const label =
    "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-lf-muted";
  const control =
    "h-9 w-full min-w-0 rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary shadow-sm outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-lf-brand";

  return (
    <details
      open={filtersOpen}
      onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
      className="group overflow-hidden rounded-2xl border border-lf-border bg-gradient-to-b from-lf-elevated/90 to-lf-surface shadow-sm ring-1 ring-black/[0.04] open:shadow-md"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-lf-border/80 bg-lf-bg/35 px-4 py-3 transition-colors hover:bg-lf-bg/50 sm:px-5 sm:py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold tracking-tight text-lf-text">
            Filters
          </span>
          <span className="mt-1 block text-[12px] leading-snug text-lf-muted">
            Search, dates, status, team, and list size. Tap to expand or
            collapse. Changes apply automatically after a short pause.
          </span>
        </span>
        <svg
          className="h-5 w-5 shrink-0 text-lf-muted transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </summary>

      <div className="border-t border-lf-border/60 px-4 pb-5 pt-4 sm:px-5">
        <div className="flex flex-col gap-4">
          <label className="block min-w-0">
            <span className={label}>Search (name, phone, email)</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search leads…"
              className={`${control} mt-1 placeholder:text-lf-muted`}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={label}>From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={`${control} mt-1 [color-scheme:light]`}
              />
            </label>
            <label className="block min-w-0">
              <span className={label}>To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={`${control} mt-1 [color-scheme:light]`}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <label className="block min-w-0">
              <span className={label}>Status</span>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as SuperadminLeadsStatus)
                }
                className={`${control} mt-1`}
              >
                <option value="ALL">All</option>
                <option value={QualificationStatus.QUALIFIED}>Qualified</option>
                <option value={QualificationStatus.NOT_QUALIFIED}>
                  Not qualified
                </option>
                <option value={QualificationStatus.IRRELEVANT}>Irrelevant</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className={label}>Analyst</span>
              <select
                value={analystId}
                onChange={(e) => setAnalystId(e.target.value)}
                className={`${control} mt-1 truncate`}
              >
                <option value="">All analysts</option>
                {analysts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={label}>Team</span>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className={`${control} mt-1 truncate`}
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={label}>Executive</span>
              <select
                value={execId}
                onChange={(e) => setExecId(e.target.value)}
                className={`${control} mt-1 truncate`}
              >
                <option value="">All execs</option>
                {execs.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={label}>Per page</span>
              <select
                value={String(perPage)}
                onChange={(e) => {
                  const v = Number.parseInt(e.target.value, 10);
                  setPerPage(v === 50 || v === 100 ? v : 25);
                }}
                className={`${control} mt-1`}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </details>
  );
}
