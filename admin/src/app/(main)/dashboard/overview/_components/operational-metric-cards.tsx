import { ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";

import { BcStatRow, BcStatTile } from "@/components/bc-panel";

export interface DashboardMetrics {
  onSiteNow: number;
  expectedToday: number;
  pendingApprovals: number;
  complianceAlerts: number;
}

const metricDefinitions = [
  {
    key: "onSiteNow",
    icon: UserCheck,
    label: "On-site now",
    hint: "Open visits in your scope",
    href: "/dashboard/visitors",
  },
  {
    key: "expectedToday",
    icon: UserPlus,
    label: "Expected today",
    hint: "Scheduled arrivals",
    href: "/dashboard/schedule",
  },
  {
    key: "pendingApprovals",
    icon: Users,
    label: "Pending approvals",
    hint: "Waiting for the front desk",
    href: "/dashboard/front-desk",
  },
  {
    key: "complianceAlerts",
    icon: ShieldCheck,
    label: "Compliance alerts",
    hint: "Retention, deletions, offline sync",
    href: "/dashboard/compliance",
  },
] as const;

export function OperationalMetricCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <BcStatRow>
      {metricDefinitions.map(({ key, icon: Icon, label, hint, href }) => (
        <BcStatTile
          key={key}
          label={label}
          hint={hint}
          href={href}
          value={metrics[key]}
          flagged={key === "complianceAlerts" && metrics.complianceAlerts > 0}
          icon={
            <div className="bc-icon-box">
              <Icon className="size-4" />
            </div>
          }
        />
      ))}
    </BcStatRow>
  );
}
