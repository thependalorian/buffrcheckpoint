"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS, DATA, DATA_MUTED, GRID, TOOLTIP_STYLE } from "@/lib/chartTokens";

export interface ShareBarDatum {
  label: string;
  value: number;
}

/**
 * Ranked horizontal bars, lead item emphasised, rest muted — for
 * concentration/pipeline-by-stage questions ("who holds the market",
 * "where is pipeline value"). Never a pie chart for this question shape
 * (buffr-intelligence/docs/data-visualization.md §7a "reject" list).
 */
export function ShareBars({
  title,
  finding,
  data,
  valuePrefix = "",
  valueSuffix = "",
}: {
  title: string;
  finding: string;
  data: ShareBarDatum[];
  /**
   * A function prop here would cross the server->client component
   * boundary uncloned — Next.js throws "Functions cannot be passed
   * directly to Client Components" the moment a server-component caller
   * (e.g. crm/page.tsx) passes one. Serializable prefix/suffix strings
   * instead, same job for the one real use case (a currency prefix).
   */
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const height = Math.max(120, sorted.length * 36);

  return (
    <div className="bc-panel">
      <div className="bc-panel-header">
        <p className="font-heading font-medium text-lg leading-none">{title}</p>
        <p className="mt-1 text-muted-foreground text-sm font-normal">{finding}</p>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fontSize: 12, fill: AXIS }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => `${valuePrefix}${Number(v).toFixed(0)}${valueSuffix}`}
              cursor={{ fill: GRID }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {sorted.map((row, i) => (
                <Cell key={row.label} fill={i === 0 ? DATA : DATA_MUTED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
