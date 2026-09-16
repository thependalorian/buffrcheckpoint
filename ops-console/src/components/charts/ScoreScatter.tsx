"use client";

import Link from "next/link";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AXIS, DATA, DATA_MUTED, GRID, STATUS, TOOLTIP_STYLE } from "@/lib/chartTokens";

export interface ScatterDatum {
  id: string;
  label: string;
  x: number;
  y: number;
  flagged?: boolean;
}

/**
 * Threshold-band scatter — "who enters review/the queue" question shape.
 * Flagged points (e.g. high churn risk) render in DATA, ordinary points
 * muted; a reference line marks the threshold rather than a shaded band
 * (recharts has no native band-fill on a scatter without a synthetic
 * area series, and a line reads just as clearly here).
 */
export function ScoreScatter({
  title,
  finding,
  data,
  xLabel,
  yLabel,
  thresholdX,
  drillHrefBase,
}: {
  title: string;
  finding: string;
  data: ScatterDatum[];
  xLabel: string;
  yLabel: string;
  thresholdX?: number;
  /**
   * A function prop here would cross the server->client component
   * boundary uncloned — Next.js throws "Functions cannot be passed
   * directly to Client Components" (same failure ShareBars' old
   * `valueFormatter` hit, the moment real data made this branch render).
   * A base path string instead — the drill-down link is always
   * `${drillHrefBase}/${id}`, so nothing is lost.
   */
  drillHrefBase?: string;
}) {
  const flagged = data.filter((d) => d.flagged);
  const ordinary = data.filter((d) => !d.flagged);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading font-medium text-lg">{title}</CardTitle>
        <p className="text-muted-foreground text-sm">{finding}</p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={GRID} />
              <XAxis
                type="number"
                dataKey="x"
                name={xLabel}
                tick={{ fontSize: 11, fill: AXIS }}
                axisLine={{ stroke: GRID }}
                tickLine={false}
                label={{ value: xLabel, position: "insideBottom", offset: -4, fontSize: 11, fill: AXIS }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yLabel}
                tick={{ fontSize: 11, fill: AXIS }}
                axisLine={false}
                tickLine={false}
                label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 11, fill: AXIS }}
              />
              {thresholdX !== undefined ? (
                <ReferenceLine x={thresholdX} stroke={STATUS.warning} strokeDasharray="4 4" />
              ) : null}
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={ordinary} fill={DATA_MUTED} />
              <Scatter data={flagged} fill={DATA} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {drillHrefBase && flagged.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {flagged.map((d) => (
              <li key={d.id}>
                <Link href={`${drillHrefBase}/${d.id}`} className="text-foreground underline underline-offset-4">
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
