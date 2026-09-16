import { ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface DashboardMetrics {
  onSiteNow: number;
  expectedToday: number;
  pendingApprovals: number;
  complianceAlerts: number;
}

const metricDefinitions = [
  { key: "onSiteNow", icon: UserCheck, label: "On-site now" },
  { key: "expectedToday", icon: UserPlus, label: "Expected today" },
  { key: "pendingApprovals", icon: Users, label: "Pending approvals" },
  { key: "complianceAlerts", icon: ShieldCheck, label: "Compliance alerts" },
] as const;

export function MetricCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {metricDefinitions.map(({ key, icon: Icon, label }) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>{label}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{metrics[key]}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
