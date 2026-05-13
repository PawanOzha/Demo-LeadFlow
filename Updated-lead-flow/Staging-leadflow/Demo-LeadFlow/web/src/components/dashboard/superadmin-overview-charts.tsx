"use client";

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

const barConfig = {  count: {
    label: "Leads",
    color: "var(--color-primary-500)",
  },
} satisfies ChartConfig;

export type SuperadminOverviewChartsProps = {
  qualified: number;
  notQualified: number;
  irrelevant: number;
  leadsByTeam: { teamName: string; count: number }[];
  leadsBySalesExec: { label: string; count: number }[];
};

export function SuperadminOverviewCharts({
  qualified,
  notQualified,
  irrelevant,
  leadsByTeam,
  leadsBySalesExec,
}: SuperadminOverviewChartsProps) {
  const totalQual =
    qualified + notQualified + irrelevant;

  const teamData = [...leadsByTeam]
    .sort((a, b) => b.count - a.count)
    .map((t) => ({
      label: t.teamName.length > 26 ? `${t.teamName.slice(0, 24)}…` : t.teamName,
      count: t.count,
    }));

  const execData = [...leadsBySalesExec]
    .sort((a, b) => b.count - a.count)
    .map((e) => ({
      label: e.label.length > 26 ? `${e.label.slice(0, 24)}…` : e.label,
      count: e.count,
    }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-lf-border/80 bg-lf-surface/90 shadow-sm lg:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lf-text">
            Organization qualification mix
          </CardTitle>
          <CardDescription>
            Radial chart (stacked, semicircle) — all leads in the database (not
            filtered by date).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center pt-0">
          {totalQual === 0 ? (
            <p className="py-16 text-center text-sm text-lf-muted">No leads yet.</p>
          ) : (
            <QualificationMixRadialStackedChart
              qualified={qualified}
              notQualified={notQualified}
              irrelevant={irrelevant}
              emptyMessage="No leads yet."
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-lf-border/80 bg-lf-surface/90 shadow-sm lg:col-span-2 lg:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lf-text">Leads by team</CardTitle>
          <CardDescription>
            Routed leads with a team assignment (current state).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {teamData.length === 0 ? (
            <p className="py-12 text-center text-sm text-lf-muted">
              No team-routed leads yet.
            </p>
          ) : (
            <ChartContainer
              config={barConfig}
              className={cn(
                "aspect-auto w-full max-w-none",
                teamData.length <= 4
                  ? "h-[220px]"
                  : teamData.length <= 10
                    ? "h-[300px]"
                    : "h-[380px]",
              )}
            >
              <BarChart
                data={teamData}
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
                  width={140}
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

      <Card className="border-lf-border/80 bg-lf-surface/90 shadow-sm lg:col-span-3 lg:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lf-text">Leads by sales executive</CardTitle>
          <CardDescription>
            Assigned leads currently tied to each rep.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {execData.length === 0 ? (
            <p className="py-12 text-center text-sm text-lf-muted">
              No executive-assigned leads yet.
            </p>
          ) : (
            <ChartContainer
              config={barConfig}
              className={cn(
                "aspect-auto w-full max-w-none",
                execData.length <= 5
                  ? "h-[260px]"
                  : execData.length <= 12
                    ? "h-[360px]"
                    : "h-[440px]",
              )}
            >
              <BarChart
                data={execData}
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
                  width={160}
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
