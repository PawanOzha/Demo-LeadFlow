"use client";

import {
  Label,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const qualRadialStackedConfig = {
  qualified: {
    label: "Qualified",
    color: "var(--color-primary-100)",
  },
  notQ: {
    label: "Not qualified",
    color: "var(--color-primary-500)",
  },
  irrelevant: {
    label: "Irrelevant",
    color: "var(--color-primary-700)",
  },
} satisfies ChartConfig;

/** Matches shadcn `ChartRadialStacked` example (`stackId="a"`). */
const STACK_ID = "a";

export type QualificationMixRadialStackedChartProps = {
  qualified: number;
  notQualified: number;
  irrelevant: number;
  className?: string;
  chartClassName?: string;
  emptyMessage?: string;
  /** When false, hides the center total (still shows legend + tooltip). */
  showCenterTotal?: boolean;
  /** Row of color keys below the chart; turn off if the parent already legends breakdown. */
  showInlineLegend?: boolean;
};

/**
 * Matches shadcn/ui “Radial Chart – Stacked”: semicircle `RadialBarChart`, stacked `RadialBar`s,
 * center label nested under `PolarRadiusAxis`, tooltip with `hideLabel`.
 */
export function QualificationMixRadialStackedChart({
  qualified,
  notQualified,
  irrelevant,
  className,
  chartClassName = "mx-auto aspect-square h-[260px] w-full max-w-[250px] sm:h-[280px] sm:max-w-[280px]",
  emptyMessage = "No data to chart.",
  showCenterTotal = true,
  showInlineLegend = true,
}: QualificationMixRadialStackedChartProps) {
  const total = qualified + notQualified + irrelevant;
  const data = [
    {
      qualified,
      notQ: notQualified,
      irrelevant,
    },
  ];

  if (total === 0) {
    return (
      <p className={cn("py-16 text-center text-sm text-lf-muted", className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-2", className)}>
      <ChartContainer config={qualRadialStackedConfig} className={chartClassName}>
        <RadialBarChart
          data={data}
          endAngle={180}
          innerRadius={80}
          outerRadius={110}
        >
          <RadialBar
            dataKey="qualified"
            stackId={STACK_ID}
            cornerRadius={5}
            fill="var(--color-qualified)"
            className="stroke-transparent stroke-2"
          />
          <RadialBar
            dataKey="notQ"
            stackId={STACK_ID}
            cornerRadius={5}
            fill="var(--color-notQ)"
            className="stroke-transparent stroke-2"
          />
          <RadialBar
            dataKey="irrelevant"
            stackId={STACK_ID}
            cornerRadius={5}
            fill="var(--color-irrelevant)"
            className="stroke-transparent stroke-2"
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            {showCenterTotal ? (
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 16}
                          className="fill-[var(--color-primary-600)] text-2xl font-bold tabular-nums"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          className="fill-[var(--color-primary-500)] opacity-90"
                        >
                          Leads
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            ) : null}
          </PolarRadiusAxis>
        </RadialBarChart>
      </ChartContainer>
      {showInlineLegend ? (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-lf-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: "var(--color-primary-100)" }}
            />
            Qualified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: "var(--color-primary-500)" }}
            />
            Not qualified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: "var(--color-primary-700)" }}
            />
            Irrelevant
          </span>
        </div>
      ) : null}
    </div>
  );
}
