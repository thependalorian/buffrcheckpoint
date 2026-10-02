// Service-level targets shown against live values on the ops overview.
// Source: buffrcheckpoint.md 11.1c "Target KPIs". Change a target here, not
// in a page.
export const SERVICE_TARGETS = {
  notificationDeliveryRate: { label: "Host notifications delivered", target: 0.98, unit: "rate" },
  etlReconciliationDifference: { label: "Analytics refresh reconciliation", target: 0, unit: "difference" },
  openIncidents: { label: "Open incidents", target: 0, unit: "count" },
  deviceComplianceRate: { label: "Devices approved for deployment", target: 1, unit: "rate" },
  visitorSatisfaction: { label: "Visitor satisfaction (28 days)", target: 4, unit: "average", minResponses: 10 },
} as const;
