import { ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";

import { BcStatRow, BcStatTile } from "@/components/bc-panel";

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

export function OperationalMetricCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <BcStatRow>
      {metricDefinitions.map(({ key, icon: Icon, label }) => (
        <BcStatTile
          key={key}
          label={label}
          value={metrics[key]}
          flagged={key === "complianceAlerts" && metrics.complianceAlerts > 0}
          icon={
            <div className="flex size-7 items-center justify-center rounded-lg border border-border bg-[color-mix(in_srgb,var(--color-cloud)_55%,var(--color-pure-white))] text-muted-foreground">
              <Icon className="size-4" />
            </div>
          }
        />
      ))}
    </BcStatRow>
  );
}
