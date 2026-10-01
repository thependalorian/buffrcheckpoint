// User-facing copy for visit roster surfaces (front desk, visitors, emergency).

export const visitRosterCopy = {
  exportCsv: "Download CSV",
  exportXlsx: "Download Excel",
} as const;

export const rosterLiveCopy = {
  live: "Live",
  liveHint: "This roster updates automatically when visitors check in or out.",
  paused: "Live updates paused",
  pausedHint: "Reconnecting. The roster still refreshes every 30 seconds.",
} as const;
