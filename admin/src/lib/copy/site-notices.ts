// Copy for the site notices admin page (emergency information and contractor induction) and the QR types that open them.

export const siteNoticesAdminCopy = {
  title: "Site Notices",
  description:
    "The text people see when they scan a QR code at your site: emergency information for anyone, and the induction a contractor reads and confirms on their own phone. Each save publishes a new version and keeps the old ones.",
  allSites: "All sites (default)",
  siteLabel: "Applies to",
  siteHelp: "A site with its own text uses it. Every other site uses the all-sites text.",
  textLabel: "Text",
  save: "Save and publish",
  saving: "Publishing...",
  saved: "Published",
  loadFailed: "Could not load this notice.",
  saveFailed: "Could not publish this notice.",
  tooShort: "Write at least 20 characters.",
  published: (version: number, siteSpecific: boolean, when: string) =>
    `Published version ${version}${siteSpecific ? " for this site" : " for all sites"}, ${when}.`,
  nothingPublished:
    "Nothing is published yet. The QR code shows a notice that it is not available until you publish text.",
  qrHint: "Issue the QR code on the Site QR Codes page, print it and put it where people will see it.",
  emergency: {
    heading: "Emergency information",
    help: "Shown to anyone who scans the emergency QR code. Say where to assemble, who to call and what to do. Do not put personal details here.",
    placeholder:
      "Assemble at the north car park.\nPolice 10111. Ambulance 211111.\nThe site safety officer is at the front desk.",
  },
  induction: {
    heading: "Contractor induction",
    help: "Contractors read this and confirm it on their phone while checked in. The confirmation is recorded against their visit. Changing the text asks everyone to confirm again.",
    placeholder:
      "1. Wear the issued helmet and vest.\n2. Report incidents to the safety desk.\n3. Stay on the marked walkways.",
  },
} as const;

/** Types that can be issued as a site QR reference, with what each opens. Keep in step with the backend allowlist. */
export const ISSUABLE_QR_TYPES = [
  {
    value: "public_site_checkin",
    label: "Public site check-in (visitors scan to check in)",
    defaultLabel: "Main entrance check-in",
  },
  {
    value: "emergency_info",
    label: "Emergency information (anyone scans to read)",
    defaultLabel: "Emergency information",
  },
  {
    value: "contractor_induction",
    label: "Contractor induction (contractors read and confirm)",
    defaultLabel: "Contractor induction",
  },
] as const;

export const deviceSupportCopy = {
  title: "Device support",
  description:
    "Everything a technician needs to identify this device. Print the QR code and stick it on the back of the device.",
  qrHeading: "Support QR code",
  qrHelp:
    "Scanning it opens this page. It needs a sign-in with permission to manage devices, so the code itself shows nothing.",
  print: "Print",
  copy: "Copy link",
  copied: "Copied",
  details: "Details",
  statusHistory: "Status history",
  noHistory: "No status changes recorded yet.",
  back: "All devices",
} as const;
