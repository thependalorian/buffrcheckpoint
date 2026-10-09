import { PUBLIC_CONTACT_EMAIL } from "./contact";

/** Copy for the public security and disclosure page (HD-4). The fix times match SECURITY.md in the repository root. */
export const SECURITY_COPY = {
  badge: "Security",
  title: "Report a security problem",
  lead: `Send reports to ${PUBLIC_CONTACT_EMAIL}. Every report is read by a person.`,
  sections: [
    {
      heading: "What to send",
      body: [
        "Tell us what you found, where you found it, and the steps to reproduce it.",
        "Leave out real personal data and visitor records. A description or a screenshot with the values hidden is enough.",
      ],
    },
    {
      heading: "What happens next",
      body: [
        "We acknowledge a report within 3 business days.",
        "We tell you when the problem is fixed, and we ask for reasonable time to fix it before you publish.",
      ],
    },
    {
      heading: "Rules for testing",
      body: [
        "Test only accounts you own.",
        "Stop when you reach personal data.",
        "Do not slow down or interrupt the service for other customers.",
        "Research in good faith inside these rules will not be pursued legally.",
      ],
    },
    {
      heading: "How fast we fix problems",
      body: [
        "We count from the day we learn of the problem. A critical problem is fixed or contained within 2 days, a high one within 7 days, a moderate one within 30 days, and a low one in the next routine update.",
      ],
    },
  ],
} as const;
