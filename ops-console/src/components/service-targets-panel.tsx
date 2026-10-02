import { SERVICE_TARGETS } from "@/lib/targets";

export interface ServiceTargetValues {
  notificationDeliveryRate: number | null;
  etlReconciliationDifference: number | null;
  openIncidents: number;
  deviceComplianceRate: number | null;
  satisfaction: { averageRating: number | null; responses: number } | null;
}

type Status = "met" | "missed" | "no-data";

/** "no-data" when there is nothing to measure; otherwise met or missed. */
function judge(value: number | null, isMet: (v: number) => boolean): Status {
  if (value === null) return "no-data";
  return isMet(value) ? "met" : "missed";
}

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

// Too few ratings is "no data", not a pass or a fail.
function satisfactionRow(satisfaction: ServiceTargetValues["satisfaction"]) {
  const target = SERVICE_TARGETS.visitorSatisfaction;
  const enough =
    satisfaction !== null && satisfaction.averageRating !== null && satisfaction.responses >= target.minResponses;
  return {
    label: target.label,
    value:
      satisfaction?.averageRating != null
        ? `${satisfaction.averageRating.toFixed(1)} / 5 (${satisfaction.responses})`
        : "No ratings yet",
    target: `>= ${target.target.toFixed(1)} / 5`,
    status: judge(enough ? (satisfaction?.averageRating ?? null) : null, (v) => v >= target.target),
  };
}

/**
 * Each row: live value, target, and whether it is met. "No data yet" is shown
 * instead of a pass when there is nothing to measure (absence is not success).
 */
export function ServiceTargetsPanel({ values }: { values: ServiceTargetValues }) {
  const rows: { label: string; value: string; target: string; status: Status }[] = [
    {
      label: SERVICE_TARGETS.notificationDeliveryRate.label,
      value: values.notificationDeliveryRate === null ? "No data yet" : percent(values.notificationDeliveryRate),
      target: `≥ ${percent(SERVICE_TARGETS.notificationDeliveryRate.target)}`,
      status: judge(values.notificationDeliveryRate, (v) => v >= SERVICE_TARGETS.notificationDeliveryRate.target),
    },
    {
      label: SERVICE_TARGETS.etlReconciliationDifference.label,
      value:
        values.etlReconciliationDifference === null ? "No run yet" : `Difference ${values.etlReconciliationDifference}`,
      target: "Difference 0",
      status: judge(
        values.etlReconciliationDifference,
        (v) => v === SERVICE_TARGETS.etlReconciliationDifference.target,
      ),
    },
    {
      label: SERVICE_TARGETS.openIncidents.label,
      value: String(values.openIncidents),
      target: "0",
      status: values.openIncidents <= SERVICE_TARGETS.openIncidents.target ? "met" : "missed",
    },
    {
      label: SERVICE_TARGETS.deviceComplianceRate.label,
      value: values.deviceComplianceRate === null ? "No devices" : percent(values.deviceComplianceRate),
      target: percent(SERVICE_TARGETS.deviceComplianceRate.target),
      status: judge(values.deviceComplianceRate, (v) => v >= SERVICE_TARGETS.deviceComplianceRate.target),
    },
    satisfactionRow(values.satisfaction),
  ];
  const missed = rows.filter((r) => r.status === "missed").length;
  const statusText: Record<Status, string> = { met: "Met", missed: "Missed", "no-data": "No data" };

  return (
    <div className="bc-panel">
      <div className="bc-panel-header">
        <p className="font-heading font-medium text-lg leading-none">Service levels against targets</p>
        <p className="mt-1 font-normal text-muted-foreground text-sm">
          {missed === 0
            ? "Every measured target is met."
            : `${missed} ${missed === 1 ? "target" : "targets"} missed. Start there.`}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b text-left text-muted-foreground">
            <th className="px-4 py-2 font-medium">Measure</th>
            <th className="px-4 py-2 text-right font-medium">Now</th>
            <th className="px-4 py-2 text-right font-medium">Target</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-border border-b last:border-0">
              <td className="px-4 py-2">{row.label}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.value}</td>
              <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">{row.target}</td>
              <td
                className={`px-4 py-2 ${row.status === "missed" ? "font-medium text-destructive" : "text-muted-foreground"}`}
              >
                {statusText[row.status]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
