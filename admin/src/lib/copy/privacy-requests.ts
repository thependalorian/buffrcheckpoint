// Copy for data-request deadlines. A request must be answered within one month of receipt; one extension of a further month is allowed
// when the reason is recorded (draft Data Protection Bill s8(3), buffrcheckpoint.md §8.5).

export type DeadlineState = "open" | "due_soon" | "overdue" | "closed";

export const privacyRequestsCopy = {
  dueColumn: "Answer by",
  extend: "Extend by one month",
  extendReasonLabel: "Reason for the extension",
  extendReasonPlaceholder: "For example: the request covers several sites",
  extendConfirm: "Record extension",
  extendCancel: "Cancel",
  extendedNote: "Extended once",
  noDeadline: "No deadline recorded",
  dashboard: {
    dueSoon: "Data requests due within 7 days",
    overdue: "Data requests overdue",
    allClear: "Every data request is inside its deadline.",
  },
  deletionMetrics: {
    heading: "Account deletion",
    received: "Requests received",
    completed: "Completed",
    medianCompletion: "Median time to complete",
    hours: "hours",
    none: "None yet",
    automated: "Steps finished automatically",
    manual: "Steps handled by a person",
    failed: "Steps waiting on a retry or review",
    onHold: "Requests on hold",
    activeHolds: "Active legal holds",
    systems: "Systems erased per request",
    tombstones: "Erasures protected against a restore",
  },
} as const;

export function deadlineLabel(state: DeadlineState, daysLeft: number | null, dueAt: string | null): string {
  if (!dueAt || daysLeft === null) return privacyRequestsCopy.noDeadline;
  const date = new Date(dueAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  if (state === "closed") return date;
  if (state === "overdue") return `${date} (${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue)`;
  return `${date} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)`;
}

export function deadlineClass(state: DeadlineState): string {
  if (state === "overdue") return "font-medium text-destructive";
  if (state === "due_soon") return "font-medium text-sodium-yellow-ink";
  return "text-muted-foreground";
}
