// Scheduled reports copy (buffrcheckpoint.md §9.5, migration 0046).

export const reportsCopy = {
  title: "Scheduled Reports",
  description:
    "Reports emailed automatically as a PDF. They contain totals only, never visitor details, and go only to verified users in your organisation with the roles you pick.",
  enabled: "Send this report",
  recipients: "Send to",
  save: "Save",
  saved: "Saved",
  runsHeading: "Recent deliveries",
  runsEmpty: "Nothing sent yet. The first weekly digest goes out on Monday at 07:00.",
  columns: { report: "Report", period: "Period", status: "Status", recipients: "Recipients", note: "Note" },
} as const;
