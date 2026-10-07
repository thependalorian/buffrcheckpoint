// Copy for the visit feedback page (ratings and comments).

export const feedbackCopy = {
  title: "Visit Feedback",
  description: "How visitors rate their visit, from 1 to 5 stars, with the comments they chose to leave.",
  period: (from: string, to: string) => `${from} to ${to}`,
  average: "Average rating",
  responses: "Responses",
  noResponses:
    "No ratings yet for this period. Ratings arrive when visitors use the link in their sign-out email or the rating screen after sign-out.",
  outOf: "out of 5",
  distribution: "How the ratings split",
  stars: (score: number) => (score === 1 ? "1 star" : `${score} stars`),
  bySite: "By site",
  columns: { site: "Site", responses: "Responses", average: "Average" },
  comments: "Recent comments",
  noComments: "No comments in this period.",
  commentsHidden: "Comments are shown to owners and site managers only. Ask one of them if you need to read them.",
  filterSite: "Site",
  allSites: "All sites",
  filterPeriod: "Period",
  periods: { "7": "Last 7 days", "28": "Last 28 days", "90": "Last 90 days" } as Readonly<Record<string, string>>,
  apply: "Apply",
} as const;

/** Share of responses for one score, as a whole percentage. Zero when there are no responses. */
export function sharePercent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}
