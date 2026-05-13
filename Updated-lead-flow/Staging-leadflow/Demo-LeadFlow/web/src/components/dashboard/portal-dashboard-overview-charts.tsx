"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { QualificationMixRadialStackedChart } from "@/components/dashboard/qualification-mix-radial-stacked-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const trendConfig = {
  total: {
    label: "Total leads",
    color: "var(--color-primary-500)",
  },
  qualified: {
    label: "Qualified",
    color: "var(--color-success-text)",
  },
  won: {
    label: "Won",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

const stageCountConfig = {
  count: {
    label: "Leads",
    color: "var(--color-primary-500)",
  },
} satisfies ChartConfig;

type TrendMetric = keyof typeof trendConfig;

function formatTrendTick(v: string) {
  try {
    const d = new Date(`${v}T12:00:00`);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(v);
  }
}

function formatTrendTooltipLabel(
  _label: ReactNode,
  payload: readonly { payload?: { date?: string } }[],
) {
  const p = payload[0]?.payload;
  if (!p?.date) return "";
  try {
    return new Date(`${p.date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return p.date;
  }
}

/** Bar chart — interactive (metric tabs + range totals), shadcn-style. */
function ActivityTrendInteractiveBars({
  trend,
}: {
  trend: { date: string; total: number; qualified: number; won: number }[];
}) {
  const [active, setActive] = useState<TrendMetric>("total");

  const sums = useMemo(
    () => ({
      total: trend.reduce((a, d) => a + d.total, 0),
      qualified: trend.reduce((a, d) => a + d.qualified, 0),
      won: trend.reduce((a, d) => a + d.won, 0),
    }),
    [trend],
  );

  const metrics = useMemo(
    () => (["total", "qualified", "won"] as const).map((key) => ({ key })),
    [],
  );

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2 rounded-xl border border-lf-border/70 bg-lf-bg/40 p-1.5 dark:bg-lf-elevated/30"
        role="tablist"
        aria-label="Activity metric"
      >
        {metrics.map(({ key }) => {
          const cfg = trendConfig[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(key)}
              className={cn(
                "min-w-[5.5rem] flex-1 rounded-lg px-3 py-2 text-left transition-all sm:min-w-0 sm:flex-initial",
                isActive
                  ? "bg-lf-surface font-semibold text-lf-text shadow-sm ring-1 ring-lf-border/80"
                  : "text-lf-muted hover:bg-lf-surface/80 hover:text-lf-text-secondary",
              )}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-lf-subtle">
                {cfg.label}
              </span>
              <span className="mt-0.5 block text-lg tabular-nums leading-none text-lf-text">
                {sums[key].toLocaleString()}
              </span>
              <span className="mt-1 block text-[10px] text-lf-subtle">
                Sum in range
              </span>
            </button>
          );
        })}
      </div>

      <ChartContainer
        config={trendConfig}
        className="aspect-auto h-[260px] w-full max-w-none sm:h-[280px]"
      >
        <BarChart
          accessibilityLayer
          data={trend}
          margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--color-lf-border)"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={28}
            tickFormatter={formatTrendTick}
            className="text-[11px] text-lf-muted"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            className="text-[11px] text-lf-muted"
          />
          <ChartTooltip
            cursor={{
              fill: "var(--color-lf-row-hover)",
              opacity: 0.45,
            }}
            content={
              <ChartTooltipContent
                labelFormatter={formatTrendTooltipLabel}
              />
            }
          />
          <Bar
            dataKey={active}
            fill={`var(--color-${active})`}
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export type PortalDashboardOverviewChartsProps = {
  rangeEmpty: boolean;
  dailyTrend: { date: string; total: number; qualified: number; won: number }[];
  qualified: number;
  notQ: number;
  irrelevant: number;
  stageRows: { label: string; count: number }[];
};

export function PortalDashboardOverviewCharts({
  rangeEmpty,
  dailyTrend,
  qualified,
  notQ,
  irrelevant,
  stageRows,
}: PortalDashboardOverviewChartsProps) {
  const stageChartData = stageRows.map((s) => ({
    label:
      s.label.length > 28 ? `${s.label.slice(0, 26)}…` : s.label,
    count: s.count,
  }));

  const trend = dailyTrend.length > 0 ? dailyTrend : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-lf-border/80 bg-lf-surface/90 shadow-sm lg:col-span-2 lg:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lf-text">Activity trend</CardTitle>
          <CardDescription>
            Daily bars — switch metric to compare total volume, qualified
            subset, or won deals. Tabs show sums for the selected range.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {rangeEmpty || trend.length === 0 ? (
            <p className="py-16 text-center text-sm text-lf-muted">
              No leads in this range — adjust filters or dates to see a trend.
            </p>
          ) : (
            <ActivityTrendInteractiveBars trend={trend} />
          )}
        </CardContent>
      </Card>

      <Card className="border-lf-border/80 bg-lf-surface/90 shadow-sm lg:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lf-text">Qualification mix</CardTitle>
          <CardDescription>
            Radial chart (stacked) — semicircle bands by outcome; thickness
            reflects counts in range.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {rangeEmpty ? (
            <p className="py-16 text-center text-sm text-lf-muted">
              No data to chart.
            </p>
          ) : (
            <QualificationMixRadialStackedChart
              qualified={qualified}
              notQualified={notQ}
              irrelevant={irrelevant}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-lf-border/80 bg-lf-surface/90 shadow-sm lg:col-span-3 lg:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lf-text">Pipeline by sales stage</CardTitle>
          <CardDescription>
            Lead counts at each stage — same scope as the KPI row above.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {rangeEmpty || stageChartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-lf-muted">
              No staged leads in range.
            </p>
          ) : (
            <ChartContainer
              config={stageCountConfig}
              className={cn(
                "aspect-auto w-full max-w-none",
                stageChartData.length <= 4
                  ? "h-[240px]"
                  : stageChartData.length <= 8
                    ? "h-[340px]"
                    : "h-[420px]",
              )}
            >
              <BarChart
                accessibilityLayer
                data={stageChartData}
                layout="vertical"
                margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--color-lf-border)"
                  strokeDasharray="4 4"
                />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={148}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-[11px] text-lf-muted"
                />
                <ChartTooltip
                  cursor={{ fill: "var(--color-lf-row-hover)", opacity: 0.5 }}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 6, 6, 0]}
                  fill="var(--color-count)"
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
