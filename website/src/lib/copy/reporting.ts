// Public copy for the "Reporting you can defend" story (platform page and a
// short home band). Every claim maps to something built: see
// buffrcheckpoint.md 11.1b "Analytics and ETL".

export const REPORTING_ANCHOR = "reporting";

export const reportingCopy = {
  title: "Reporting you can defend",
  intro:
    "A chart is only useful if someone can act on it and an auditor can check it. Checkpoint reports are built from your own check-in records, and every number can be traced back to them.",
  principles: [
    {
      title: "Every chart answers one question",
      body: "Each panel names the question, states the finding and says what to do next. For example: busiest hour, Monday 10:00 to 11:00, keep a receptionist free.",
    },
    {
      title: "Counts, never guest details",
      body: "Reports are built from counts. No report view holds a name, phone number or ID number, so a report cannot leak one.",
    },
    {
      title: "The numbers reconcile",
      body: "Every hourly refresh checks that each check-in is counted exactly once. If the totals disagree, the refresh fails visibly instead of drifting quietly.",
    },
    {
      title: "Forecasts show their error",
      body: "Arrival forecasts are tested against a simple rule, same day last week, and show a likely range. With fewer than 28 days of history there is no forecast, only a note saying so.",
    },
    {
      title: "Empty is not zero",
      body: "A day with no records shows as empty, not as a quiet day. Shared statistics withhold small counts so no property or guest can be singled out.",
    },
  ],
  figures: {
    busyHours: {
      src: "/screenshots/analytics-busy-hours.png",
      width: 1695,
      height: 1092,
      alt: "Busy-hours heatmap by weekday and hour, headed by the busiest hour and its share of arrivals.",
      caption: "Busy hours: when the desk needs a second pair of hands.",
    },
    channels: {
      src: "/screenshots/analytics-channels.png",
      width: 1696,
      height: 652,
      alt: "Share of check-ins by channel, led by QR code check-in.",
      caption: "How guests check in, and what to change at the desk.",
    },
    visitorTypes: {
      src: "/screenshots/analytics-visitor-types.png",
      width: 1695,
      height: 647,
      alt: "Share of arrivals by visitor type.",
      caption: "Who is arriving, so the check-in form asks the right questions.",
    },
  },
  audiencesTitle: "Who the reports are for",
  audiences: [
    {
      who: "Front desk manager",
      question: "When do I need a second receptionist?",
      answer: "Busy hours and the arrivals forecast show the peaks before they happen.",
    },
    {
      who: "Head office and lodge groups",
      question: "How do my sites compare?",
      answer: "Filter by site and download the daily counts as a spreadsheet for your own reporting.",
    },
    {
      who: "Auditors and compliance officers",
      question: "Who was on the property on the night of 14 March, and who viewed that record?",
      answer:
        "The audit trail and evidence packs answer in minutes, not by paging through a book. Evidence packs are on the Assure plan.",
    },
    {
      who: "Tourism bodies",
      question: "How many arrivals by region?",
      answer: "Anonymised regional arrival statistics, with small counts withheld, are available on request.",
    },
  ],
} as const;
