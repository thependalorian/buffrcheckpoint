// Privacy Policy facts that must match what the product actually does. The provider list mirrors backend/src/common/privacy/subprocessors.ts
// (a backend test fails if the two differ). A region that is not confirmed says so; it is never guessed.

export interface PolicySubprocessor {
  name: string;
  purpose: string;
  region: string;
  visitorPersonalData: boolean;
}

export const POLICY_SUBPROCESSORS: readonly PolicySubprocessor[] = [
  { name: "Neon", purpose: "Database and encrypted document storage", region: "Frankfurt, Germany", visitorPersonalData: true },
  { name: "Railway", purpose: "Application server (API)", region: "Amsterdam, Netherlands", visitorPersonalData: true },
  { name: "Vercel", purpose: "Website, admin and ops console hosting", region: "Global edge network", visitorPersonalData: false },
  { name: "Namecheap Private Email", purpose: "Sending service email", region: "Not confirmed", visitorPersonalData: true },
  { name: "BulkSMS Namibia", purpose: "Text messages, only for organisations that switch them on", region: "Not confirmed", visitorPersonalData: true },
  { name: "Adumo Online", purpose: "Card payment page for subscription invoices; no visitor data", region: "Not confirmed", visitorPersonalData: false },
  { name: "Sentry", purpose: "Error reports, scrubbed of personal data", region: "Not confirmed", visitorPersonalData: false },
  { name: "PostHog", purpose: "Product analytics after consent; codes and counts only", region: "United States", visitorPersonalData: false },
];

export const PRIVACY_COPY = {
  retention:
    "Retention is automatic. Unless an organisation sets a different period, visit records are removed 365 days after check-out. A record under a legal hold is kept until the hold ends. The addresses, mobile numbers and text of queued emails and text messages are cleared 30 days after delivery. You do not have to configure any of this.",
  transfer:
    "Visitor data is processed in Germany and the Netherlands, outside Namibia. Where the draft Namibian Data Protection Bill applies, we document the safeguards for that transfer and keep this list current. We do not claim that data is hosted in Namibia.",
  subprocessorsIntro: "These providers process data for us. Only those marked as handling visitor data can receive it.",
  cookiesAnalytics: "Product analytics (PostHog, United States) loads only after you accept the cookie banner.",
} as const;
