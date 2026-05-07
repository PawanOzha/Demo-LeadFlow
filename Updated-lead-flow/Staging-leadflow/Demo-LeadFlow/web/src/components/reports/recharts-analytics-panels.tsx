"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string;
  total: number;
  qualified: number;
  won: number;
};

type Slice = {
  name: string;
  value: number;
};

type Rank = {
  name: string;
  value: number;
};

const DONUT_COLORS = [
  "var(--color-primary-500)",
  "var(--color-info-text)",
  "var(--color-warning-text)",
  "var(--color-danger-text)",
  "var(--color-neutral-500)",
];

function TooltipCard({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; color?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-xl border border-lf-border bg-lf-surface p-3 shadow-[var(--shadow-lf-lg)]">
      <p className="mb-2 text-xs font-medium text-lf-muted">{label}</p>
      {payload.map((entry) => (
        <div
          key={`${entry.name}-${entry.color}`}
          className="flex items-center justify-between gap-6 py-0.5"
        >
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-lf-text-secondary">{entry.name}</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-lf-text">
            {Number(entry.value ?? 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RechartsAnalyticsPanels({
  trendData,
  statusData,
  rankingData,
}: {
  trendData: Point[];
  statusData: Slice[];
  rankingData: Rank[];
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-lf-border/80 bg-lf-surface p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-lf-text">Trend</h2>
          <p className="text-sm text-lf-muted">
            Total, qualified, and won leads over time.
          </p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrimaryTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-neutral-100)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--color-neutral-400)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--color-neutral-400)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TooltipCard />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-sm text-lf-text-secondary">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke="var(--color-primary-500)"
                strokeWidth={2}
                fill="url(#colorPrimaryTrend)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-primary-500)" }}
              />
              <Area
                type="monotone"
                dataKey="qualified"
                name="Qualified"
                stroke="var(--color-info-text)"
                strokeWidth={2}
                fillOpacity={0}
                fill="transparent"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-info-text)" }}
              />
              <Area
                type="monotone"
                dataKey="won"
                name="Won"
                stroke="var(--color-success-text)"
                strokeWidth={2}
                fillOpacity={0}
                fill="transparent"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-success-text)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-lf-text">Lead Distribution</h3>
            <p className="text-sm text-lf-muted">By qualification status.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusData.map((_, index) => (
                    <Cell key={`slice-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipCard />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-lf-text-secondary">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-lf-border/80 bg-lf-surface p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-lf-text">Top Sources</h3>
            <p className="text-sm text-lf-muted">Highest lead volume sources.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rankingData}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-neutral-100)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "var(--color-neutral-400)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--color-neutral-600)" }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<TooltipCard />} cursor={{ fill: "var(--color-neutral-50)" }} />
                <Bar
                  dataKey="value"
                  fill="var(--color-primary-500)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
