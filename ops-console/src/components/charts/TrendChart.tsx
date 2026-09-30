"use client";

import Link from "next/link";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS, DATA, DATA_FILL_OPACITY, GRID, TOOLTIP_STYLE } from "@/lib/chartTokens";

export interface TrendPoint {
  period: string;
  value: number;
}

/**
 * Line + end-label + %-change trend chart. Every chart on this console
 * answers a named question (buffr-intelligence/docs/data-visualization.md
 * §1) — `finding` is required, not optional decoration, and `drillHref`
 * turns the chart into a chart-to-queue link rather than an inert plate.
 */
export function TrendChart({
  title,
  finding,
  data,
  drillHref,
  drillLabel,
}: {
  title: string;
  finding: string;
  data: TrendPoint[];
  drillHref?: string;
  drillLabel?: string;
}) {
  const last = data.at(-1);
  const prev = data.at(-2);
  const change = last && prev && prev.value !== 0 ? ((last.value - prev.value) / prev.value) * 100 : null;

  return (
    <div className="bc-panel">
      <div className="bc-panel-header">
        <p className="font-heading font-medium text-lg leading-none">{title}</p>
        <p className="mt-1 text-muted-foreground text-sm font-normal">{finding}</p>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-heading font-light text-3xl text-foreground tabular-nums">{last?.value ?? 0}</span>
        {change !== null ? (
          <span className={`text-sm ${change > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {change > 0 ? "+" : ""}
            {change.toFixed(0)}% vs prior period
          </span>
        ) : null}
      </div>
      <div className="mt-3 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: AXIS }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={DATA}
              strokeWidth={2}
              dot={false}
              fillOpacity={DATA_FILL_OPACITY}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {drillHref ? (
        <Link href={drillHref} className="mt-2 inline-block text-foreground text-sm underline underline-offset-4">
          {drillLabel ?? "View queue"}
        </Link>
      ) : null}
    </div>
  );
}
