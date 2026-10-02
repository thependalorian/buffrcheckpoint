// Live anomaly alerts copy (buffrcheckpoint.md 11.1c, migration 0045).

export const anomaliesCopy = {
  title: "Anomaly Alerts",
  description:
    "Unusual check-in patterns, raised as they happen. Alerts are for your team to review. They never block or delay a visitor.",
  listHeading: (open: number) =>
    open === 1 ? "1 open alert in the last 7 days" : `${open} open alerts in the last 7 days`,
  empty: "No alerts in the last 7 days.",
  emptyOpen: "No open alerts. Everything raised in the last 7 days has been reviewed.",
  filters: { open: "Open", all: "All" },
  columns: { when: "When", site: "Site", rule: "What happened", detail: "Detail", state: "Status", actions: "" },
  states: { open: "Open", acknowledged: "Acknowledged", dismissed: "Dismissed" } as Record<string, string>,
  actions: { acknowledge: "Acknowledge", dismiss: "Dismiss", reopen: "Reopen" },
  reviewed: "Updated",
  rulesHeading: "Rules for each site",
  rulesDescription:
    "Sites without changes use the defaults: 3 check-ins from the same phone within 30 minutes, and any check-in to a sensitive or restricted zone outside 07:00 to 18:00.",
  rulesUnavailable: "You need site configuration rights to change these rules.",
  enabled: "On",
  threshold: "Check-ins",
  window: "Within (minutes)",
  hoursFrom: "Visitor hours from",
  hoursTo: "to",
  defaultBadge: "Default",
  save: "Save",
  saved: "Saved",
} as const;

export function describeAlert(ruleCode: string, payload: Record<string, string | number | null> | null): string {
  if (!payload) return "";
  if (ruleCode === "repeat_phone_window") {
    return `${payload.checkIns} check-ins from one phone within ${payload.windowMinutes} minutes`;
  }
  if (ruleCode === "after_hours_restricted_zone") {
    return `Checked in at ${payload.localTime}, outside visitor hours ${payload.visitorHours}`;
  }
  return "";
}
