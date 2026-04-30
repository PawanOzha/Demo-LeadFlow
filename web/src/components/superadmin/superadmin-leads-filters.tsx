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
  const [duplicatePhonesOnly, setDuplicatePhonesOnly] = useState(
    initial.duplicatePhonesOnly,
  );
  const [status, setStatus] = useState<SuperadminLeadsStatus>(initial.status);
  const [analystId, setAnalystId] = useState(initial.analystId ?? "");
  const [teamId, setTeamId] = useState(initial.teamId ?? "");
  const [execId, setExecId] = useState(initial.execId ?? "");
  const [perPage, setPerPage] = useState<25 | 50 | 100>(initial.perPage);
  const hydrated = useRef(false);

  const nextHref = useMemo(() => {
    const p = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search.slice(1) : "",
    );
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
    if (duplicatePhonesOnly) p.set("duplicatePhonesOnly", "1");
    else p.delete("duplicatePhonesOnly");
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
    duplicatePhonesOnly,
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

  const fieldLabel =
    "text-[12px] font-medium uppercase tracking-wide text-lf-muted xl:text-[11px]";
  const fieldControl =
    "mt-1.5 block h-9 w-full rounded-lg border border-lf-border bg-lf-surface px-3 text-[13px] text-lf-text-secondary outline-none appearance-none focus:border-transparent focus:ring-2 focus:ring-lf-brand xl:mt-1 xl:h-9 xl:px-3 xl:text-[13px]";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-lf-border bg-lf-surface px-4 py-3">
      <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-end xl:gap-3">
        <p className="shrink-0 px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-widest text-lf-muted xl:pb-1.5">
          Filters
        </p>

        <div className="min-w-0 flex-1 xl:overflow-x-auto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-nowrap xl:items-end xl:gap-2 xl:pb-0.5">
            <label className="block min-w-0 sm:col-span-2 lg:col-span-2 xl:min-w-[200px] xl:max-w-[min(22rem,28vw)] xl:flex-1">
              <span className={fieldLabel}>Search (name, phone, email)</span>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, phone, or email…"
                className="h-9 w-64 rounded-lg border border-lf-border bg-lf-bg/80 pl-9 pr-4 text-[13px] text-lf-text placeholder:text-lf-muted outline-none transition-all focus:border-transparent focus:bg-lf-surface focus:ring-2 focus:ring-lf-brand"
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-lf-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={duplicatePhonesOnly}
                onChange={(e) => setDuplicatePhonesOnly(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-lf-border text-lf-text focus:ring-lf-brand focus:ring-offset-0"
              />
              <span className="whitespace-nowrap leading-tight">Dup phones</span>
            </label>
            <label className="block min-w-0 shrink-0 xl:min-w-[118px]">
              <span className={fieldLabel}>From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={
                  fieldControl + " [color-scheme:light] xl:min-w-[118px]"
                }
              />
            </label>
            <label className="block min-w-0 shrink-0 xl:min-w-[118px]">
              <span className={fieldLabel}>To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={
                  fieldControl + " [color-scheme:light] xl:min-w-[118px]"
                }
              />
            </label>
            <label className="block min-w-0 shrink-0 xl:min-w-[108px]">
              <span className={fieldLabel}>Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SuperadminLeadsStatus)}
                className={fieldControl}
              >
                <option value="ALL">All</option>
                <option value={QualificationStatus.QUALIFIED}>Qualified</option>
                <option value={QualificationStatus.NOT_QUALIFIED}>
                  Not qualified
                </option>
                <option value={QualificationStatus.IRRELEVANT}>Irrelevant</option>
              </select>
            </label>
            <label className="block min-w-0 shrink-0 xl:min-w-[140px]">
              <span className={fieldLabel}>Analyst</span>
              <select
                value={analystId}
                onChange={(e) => setAnalystId(e.target.value)}
                className={fieldControl + " truncate"}
              >
                <option value="">All analysts</option>
                {analysts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 shrink-0 xl:min-w-[120px]">
              <span className={fieldLabel}>Team</span>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className={fieldControl + " truncate"}
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 shrink-0 xl:min-w-[140px]">
              <span className={fieldLabel}>Executive</span>
              <select
                value={execId}
                onChange={(e) => setExecId(e.target.value)}
                className={fieldControl + " truncate"}
              >
                <option value="">All execs</option>
                {execs.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 shrink-0 xl:min-w-[76px]">
              <span className={fieldLabel}>Per page</span>
              <select
                value={String(perPage)}
                onChange={(e) => {
                  const v = Number.parseInt(e.target.value, 10);
                  setPerPage(v === 50 || v === 100 ? v : 25);
                }}
                className={fieldControl}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
