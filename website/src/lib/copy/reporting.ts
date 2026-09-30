// Public copy for the "Reporting you can defend" story (platform page and a
// short home band). Every claim maps to something built: see
// buffrcheckpoint.md 11.1b "Analytics and ETL".

export const REPORTING_ANCHOR = "reporting";

export const reportingCopy = {
  title: "Reporting you can defend",
  intro:
    "Checkpoint turns your own check-in records into decisions your team can act on and figures an auditor can trace back to the source.",
  principles: [
    {
      title: "Every chart leads with a finding",
      body: "Each panel names the question, states what the data shows and suggests the next step, such as the busiest hour of the week and when to add a receptionist.",
    },
    {
      title: "Built from counts",
      body: "Reports use counts of arrivals, so managers see the patterns while guest details stay in the protected visitor record.",
    },
    {
      title: "Numbers that reconcile",
      body: "Every hourly refresh confirms each check-in is counted exactly once, so the dashboard, the export and the audit trail agree.",
    },
    {
      title: "Forecasts with a likely range",
      body: "Arrival forecasts come with a likely range and are measured against last week's pattern, so you know how far to rely on them. They start once a site has four weeks of history.",
    },
    {
      title: "Clear gaps, safe sharing",
      body: "Days without records show clearly as gaps, and shared regional statistics group small numbers so every property and guest stays anonymous.",
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
      who: "Head office and lodge groups",
      image: {
        src: "/screenshots/analytics-site-filter.png",
        width: 1826,
        height: 660,
        alt: "Analytics filtered to one site, with the Download CSV button.",
      },
      question: "How do my sites compare?",
      answer: "Filter by site and download the daily counts as a spreadsheet for your own reporting.",
    },
    {
      who: "Auditors and compliance officers",
      image: {
        src: "/screenshots/evidence-report.png",
        width: 2336,
        height: 640,
        alt: "Evidence pack report header with visits in period, audited actions, people with access and an intact audit hash chain.",
      },
      question: "Who was on the property on the night of 14 March, and who viewed that record?",
      answer:
        "The audit trail and evidence packs answer in minutes, not by paging through a book. Evidence packs are on the Assure plan.",
    },
    {
      who: "Tourism bodies",
      image: {
        src: "/screenshots/ops-arrivals-by-region.png",
        width: 1708,
        height: 934,
        alt: "Anonymised arrivals by region, with small counts shown as fewer than 5.",
      },
      question: "How many arrivals by region?",
      answer: "Anonymised regional arrival statistics, with small counts withheld, are available on request.",
    },
  ],
} as const;
