"use client";

import { format, parseISO } from "date-fns";
import { Area, CartesianGrid, ComposedChart, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface VisitActivityPoint {
  date: string; // yyyy-MM-dd
  checkIns: number;
  complianceEvents: number;
}

// Two series, not three — a "visit" and a "check-in" are the same event in
// this domain (a visitor_visits row is created at check-in, Section 8.1),
// so a separate "visits" series would just duplicate checkIns rather than
// showing something real.
const chartConfig = {
  checkIns: {
    label: "Check-ins",
    color: "var(--chart-1)",
  },
  complianceEvents: {
    label: "Compliance events",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function PerformanceOverview({ data }: { data: VisitActivityPoint[] }) {
  const hasActivity = data.some((point) => point.checkIns > 0 || point.complianceEvents > 0);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Visit Activity</CardTitle>
        <CardDescription>Check-ins and audit events over the last {data.length} days</CardDescription>
      </CardHeader>

      <CardContent>
        {hasActivity ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
            <ComposedChart data={data} margin={{ top: 0 }}>
              <defs>
                <linearGradient id="fillCheckIns" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-checkIns)" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="var(--color-checkIns)" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="fillComplianceEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-complianceEvents)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--color-complianceEvents)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.5} />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={48}
                tickFormatter={(value) =>
                  parseISO(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />

              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="w-50"
                    indicator="line"
                    labelFormatter={(value) => format(parseISO(value), "d MMMM yyyy")}
                  />
                }
              />
              <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-5 justify-end" />} />

              <Area
                dataKey="checkIns"
                type="natural"
                fill="url(#fillCheckIns)"
                stroke="var(--color-checkIns)"
                strokeWidth={1.25}
                dot={false}
                fillOpacity={1}
              />
              <Area
                dataKey="complianceEvents"
                type="natural"
                fill="url(#fillComplianceEvents)"
                stroke="var(--color-complianceEvents)"
                strokeWidth={1.2}
                dot={false}
                fillOpacity={1}
              />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <div className="flex h-80 w-full items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
            No check-ins or audit events in this period yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
