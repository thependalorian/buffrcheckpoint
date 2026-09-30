"use client";

import { format, parseISO } from "date-fns";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AXIS, DATA, DATA_MUTED, GRID } from "@/lib/chartTokens";
import { analyticsCopy } from "@/lib/copy/analytics";

export interface TrendRow {
  date: string;
  actual?: number;
  forecast?: number;
  range?: [number, number];
}

const config = {
  actual: { label: analyticsCopy.trend.legendActual, color: DATA },
  forecast: { label: analyticsCopy.trend.legendForecast, color: AXIS },
  range: { label: analyticsCopy.trend.legendRange, color: DATA_MUTED },
} satisfies ChartConfig;

/** Arrivals as a line, the forecast as a dashed line with its likely range shaded. */
export function TrendWithForecast({ rows }: { rows: TrendRow[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <ComposedChart data={rows} margin={{ top: 8, left: -16, right: 8 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tickFormatter={(value: string) => format(parseISO(value), "d MMM")}
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        <ChartTooltip
          content={
            <ChartTooltipContent labelFormatter={(value) => format(parseISO(String(value)), "EEE d MMM yyyy")} />
          }
        />
        <Area dataKey="range" stroke="none" fill={DATA_MUTED} fillOpacity={0.6} isAnimationActive={false} />
        <Line dataKey="actual" stroke={DATA} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line
          dataKey="forecast"
          stroke={AXIS}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
