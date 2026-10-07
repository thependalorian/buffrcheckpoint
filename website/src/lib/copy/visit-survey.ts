// Post-visit rating and feedback copy (buffrcheckpoint.md §10.2).

export const visitSurveyCopy = {
  question: "How was your visit today?",
  optional: "Optional. Choose 1 to 5 stars. Please leave out personal details.",
  starsLegend: "Rating, from 1 star to 5 stars",
  starLabel: (score: number, label: string) => `${score} of 5 stars, ${label}`,
  chosen: (score: number, label: string) => `${score} of 5: ${label}`,
  commentLabel: "Anything we should know? (optional)",
  commentHelp: "Your comment is stored encrypted and is only shown to the people who run this site.",
  commentPlaceholder: "Tell us what went well or what could be better.",
  charactersLeft: (left: number) => `${left} characters left`,
  submit: "Send feedback",
  saving: "Sending...",
  thanks: "Thank you. Your feedback helps the site improve.",
  expired: "This survey has closed. Thank you for visiting.",
  failed: "We could not save your feedback. You can close this page.",
  maxCommentLength: 1000,
  rate: {
    title: "Rate your visit",
    intro: "It takes a few seconds and helps the site improve.",
    missingLink: "This rating link is not valid. If you were sent it by email, open the link from that email.",
  },
} as const;
