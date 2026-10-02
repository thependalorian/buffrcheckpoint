// User-facing copy for /dashboard/analytics. Every panel states the question
// it answers, a finding computed from the data, why it matters and what to
// do next (see buffr-intelligence/docs/data-visualization.md section 1).

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Clearer names for arrival channels than the internal type labels. */
export const CHANNEL_LABELS: Record<string, string> = {
  qr: "QR code",
  assisted: "Receptionist-assisted",
  kiosk: "Reception tablet",
  nfc_badge: "Badge",
  nfc_phone: "Phone tap",
};

export const analyticsCopy = {
  title: "Analytics",
  description:
    "Arrivals, busy hours and how guests check in, from your own check-in records. Counts only, never guest details.",
  refreshed: (when: string) => `Figures refreshed ${when}. Updated hourly.`,
  notRefreshed: "Figures appear after the first hourly refresh.",
  filters: {
    range: "Period",
    site: "Site",
    allSites: "All sites",
    apply: "Apply",
    ranges: [
      { value: "7", label: "Last 7 days" },
      { value: "30", label: "Last 30 days" },
      { value: "90", label: "Last 90 days" },
      { value: "365", label: "Last 12 months" },
    ],
  },
  export: "Download CSV",
  exportXlsx: "Download Excel",
  exportHint: "Daily counts by site, visitor type and channel, for auditors and head office.",
  kpis: {
    checkIns: "Check-ins",
    avgMinutes: "Average time on site",
    ownPhone: "Checked in by QR code",
    offline: "Captured offline",
    minutes: (n: number) => `${n} min`,
    percent: (n: number) => `${n}%`,
    change: (pct: number) => `${pct > 0 ? "+" : ""}${pct}% on previous period`,
    noPrevious: "No previous period to compare",
    none: "Not enough data",
  },
  satisfaction: {
    label: "Visitor satisfaction, last 28 days",
    value: (average: number, responses: number) =>
      `${average.toFixed(1)} out of 5 from ${responses} ${responses === 1 ? "rating" : "ratings"} (target 4.0 or higher)`,
    none: "No ratings yet. Visitors are asked for an optional rating when they sign out.",
  },
  trend: {
    question: "How many arrivals should the desk plan for?",
    finding: (total: number, busiest: string | null) =>
      busiest ? `${total} arrivals in this period, busiest on ${busiest}s` : `${total} arrivals in this period`,
    empty: "No check-ins in this period yet.",
    why: "Arrivals follow a weekly rhythm. Knowing it tells you when the desk needs a second pair of hands.",
    forecastFinding: (total: number, days: number) => `About ${total} arrivals expected over the next ${days} days`,
    forecastNext: "Roster reception against the shaded range, not the single line.",
    backtest: (mase: number) =>
      `Backtest on the last 28 days: error ${mase} times that of "same day last week" (below 1 means the forecast is better).`,
    backtestNone: "Backtest: too little day-to-day variation to score the forecast yet.",
    insufficient: (have: number, need: number) =>
      `Forecasts start after ${need} days of check-ins. ${have} days recorded so far.`,
    legendActual: "Arrivals",
    legendForecast: "Forecast",
    legendRange: "Likely range",
    source: "Source: your check-in records, local time. Forecast: average of the same weekday over the last 8 weeks.",
  },
  busyHours: {
    question: "When is the desk busiest?",
    finding: (day: string, hour: number, pct: number) =>
      `Busiest hour: ${day} ${String(hour).padStart(2, "0")}:00 to ${String(hour + 1).padStart(2, "0")}:00, ${pct}% of arrivals`,
    why: "Queues at reception form in a few predictable hours.",
    next: "Keep the reception tablet on and a receptionist free during the darkest cells.",
    empty: "Busy hours appear once check-ins are recorded in this period.",
    source: "Source: check-ins by local hour. Darker cells mean more arrivals.",
  },
  channels: {
    question: "How do guests check in?",
    finding: (label: string, pct: number) => `${label}: ${pct}% of check-ins`,
    why: "Every guest who checks in with the QR code frees the desk for the ones who need help.",
    next: "Place the QR code where guests queue, and keep assisted check-in for those without a phone.",
    empty: "No check-ins in this period yet.",
  },
  visitorTypes: {
    question: "Who is arriving?",
    finding: (label: string, pct: number) => `${label}: ${pct}% of arrivals`,
    why: "The mix of guests, contractors and day visitors shapes what the check-in form should ask.",
    next: "Review the check-in form for your largest group first.",
    empty: "No check-ins in this period yet.",
  },
  overviewLink: "See full analytics",
  error: "Analytics could not be loaded.",
} as const;
