// The subprocessors Checkpoint uses and where they process data. One list feeds the evidence pack and the Privacy Policy text, so the two
// cannot disagree (draft Data Protection Bill s18(4) and s24; buffrcheckpoint.md §18.5). Where a region is not confirmed the entry says so:
// an unverified region is never presented as a fact.

export interface Subprocessor {
  name: string;
  purpose: string;
  /** Where the data is processed. "Not confirmed" is a valid, honest value. */
  region: string;
  /** Whether visitor personal data can reach this vendor. */
  visitorPersonalData: boolean;
  outsideNamibia: boolean;
}

export const SUBPROCESSORS: readonly Subprocessor[] = [
  { name: "Neon", purpose: "Database and encrypted document storage", region: "Frankfurt, Germany", visitorPersonalData: true, outsideNamibia: true },
  { name: "Railway", purpose: "Application server (API)", region: "Amsterdam, Netherlands", visitorPersonalData: true, outsideNamibia: true },
  { name: "Vercel", purpose: "Website, admin and ops console hosting", region: "Global edge network", visitorPersonalData: false, outsideNamibia: true },
  { name: "Namecheap Private Email", purpose: "Sending service email", region: "Not confirmed", visitorPersonalData: true, outsideNamibia: true },
  { name: "BulkSMS Namibia", purpose: "Text messages, only for organisations that switch them on", region: "Not confirmed", visitorPersonalData: true, outsideNamibia: false },
  { name: "Adumo Online", purpose: "Card payment page for subscription invoices; no visitor data", region: "Not confirmed", visitorPersonalData: false, outsideNamibia: true },
  { name: "Sentry", purpose: "Error reports, scrubbed of personal data", region: "Not confirmed", visitorPersonalData: false, outsideNamibia: true },
  { name: "Cloudflare", purpose: "Bot check (Turnstile) on sign-up, sign-in, password reset and the contact form; no visitor data", region: "Global edge network", visitorPersonalData: false, outsideNamibia: true },
  { name: "PostHog", purpose: "Product analytics after consent; codes and counts only", region: "United States", visitorPersonalData: false, outsideNamibia: true },
];

export function subprocessorsWithVisitorData(): Subprocessor[] {
  return SUBPROCESSORS.filter((s) => s.visitorPersonalData);
}

export function unconfirmedRegions(): Subprocessor[] {
  return SUBPROCESSORS.filter((s) => s.region === "Not confirmed");
}
