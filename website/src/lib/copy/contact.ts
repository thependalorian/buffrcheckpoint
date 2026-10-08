/** Public sales and general enquiries. Every address routes into the one Buffr mailbox; role addresses are aliases of it. */
export const PUBLIC_CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "team@buffranalytics.com";

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

/** The contact form on /contact. It posts to the API, which keeps a durable record and acknowledges by email. */
export const CONTACT_FORM = {
  heading: "Send us a message",
  topicLabel: "What is it about?",
  nameLabel: "Your name",
  emailLabel: "Your email",
  companyLabel: "Organisation (optional)",
  messageLabel: "Message",
  messageHelp: "Choosing a topic fills in a few prompts. Replace them with your own words.",
  submit: "Send message",
  sending: "Sending",
  success: "Thank you. We have your message and have emailed you a confirmation. We reply within two business days.",
  tooMany: "You have sent several messages in a short time. Please wait a few minutes and try again.",
  invalid: "Please check your name, your email address and your message, then try again.",
  failed: "The message could not be sent. Please try again, or write to us at",
} as const;
