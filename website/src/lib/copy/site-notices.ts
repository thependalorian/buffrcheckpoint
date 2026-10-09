// Copy for the pages the emergency information and contractor induction QR codes open.

export const siteNoticesCopy = {
  emergency: {
    shellLabel: "Emergency information",
    title: "Emergency information",
    siteLine: (siteName: string) => `For ${siteName}`,
    updated: (version: number, when: string) => `Version ${version}, updated ${when}`,
    notPublished: "This site has not published its emergency information yet. Ask reception or a member of staff.",
    invalidLink: "This QR code is not valid or has expired. Ask reception for the current emergency information.",
    loading: "Loading emergency information...",
  },
  induction: {
    shellLabel: "Contractor induction",
    title: "Contractor induction",
    siteLine: (siteName: string) => `For ${siteName}`,
    updated: (version: number, when: string) => `Version ${version}, updated ${when}`,
    notPublished: "This site has not published a contractor induction yet. Ask the person who booked you in.",
    invalidLink: "This QR code is not valid or has expired. Ask reception for a new one.",
    loading: "Loading the induction...",
    phoneLabel: "Mobile number you checked in with",
    phoneHelp: "We use it only to find your open visit. Check in first if you have not yet.",
    confirm: "I have read and understood this induction.",
    submit: "Confirm induction",
    saving: "Saving...",
    done: "Thank you. Your induction is recorded against your visit.",
    doneRepeat: "You had already confirmed this induction. Nothing more to do.",
    changed:
      "The induction was updated while you were reading it. The new version is shown below. Please read it again.",
    failed: "We could not record your confirmation. Please try again or ask reception.",
  },
} as const;

/** "7 Oct 2026" in the site's time zone, from an ISO timestamp. Empty when the value is not a date. */
export function formatNoticeDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Windhoek",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
