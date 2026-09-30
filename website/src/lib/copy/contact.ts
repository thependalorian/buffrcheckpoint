/** Public sales and general enquiries (Buffr Analytics team inbox). */
export const PUBLIC_CONTACT_EMAIL = "team@buffranalytics.com";

/** Direct-email topics on /contact. Each opens the visitor's mail app with a subject and a short prompt. */
export const CONTACT_EMAIL_TOPICS = [
  {
    title: "Multi-site rollouts",
    body: "Several sites, kiosks, or NFC badges. Tell us how visitors sign in today and how many arrive on a busy day.",
    subject: "Multi-site rollout",
    prompt:
      "Organisation:\nNumber of sites:\nHow visitors sign in today:\nVisitors on a busy day:\nHardware you want (kiosk, NFC badges):\n",
  },
  {
    title: "Questions before you sign up",
    body: "Plans, billing by EFT, data protection, or anything the pricing page leaves open.",
    subject: "Question before signing up",
    prompt: "Organisation:\nYour question:\n",
  },
  {
    title: "Partnerships and integrations",
    body: "Resellers, hardware suppliers, and teams connecting a PMS or access-control system.",
    subject: "Partnership",
    prompt: "Organisation:\nPartnership type (reseller, hardware, integration):\nWhat you have in mind:\n",
  },
  {
    title: "Urgent check-in problem",
    body: "Visitors blocked at the door on a live site. Put your organisation and site in the subject line.",
    subject: "URGENT: check-in problem",
    prompt: "Organisation:\nSite:\nWhat visitors see:\nWhen it started:\n",
  },
] as const;

export function contactMailto(subject: string, prompt?: string): string {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (prompt) params.push(`body=${encodeURIComponent(prompt)}`);
  return `mailto:${PUBLIC_CONTACT_EMAIL}?${params.join("&")}`;
}
