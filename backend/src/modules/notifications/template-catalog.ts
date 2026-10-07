/**
 * Every email Checkpoint sends: what triggers it, who gets it, and how it is laid out. The code is the key in
 * `platform_notification_template` (ops edit the wording there; this file holds the structure). A test keeps this list, the seeded
 * templates and the codes used in the source in step, so an email cannot be added without being described here.
 */
export type EmailCategory =
  | "account_security"
  | "onboarding"
  | "billing"
  | "verification"
  | "visitor_flow"
  | "support"
  | "ops_internal"
  | "report";
export type EmailAudience =
  | "customer_user"
  | "customer_admins"
  | "host"
  | "visitor"
  | "enquirer"
  | "platform_staff"
  | "ops_inbox";

import type { SignatureKey } from "./email-compose";

export interface TemplateSpec {
  category: EmailCategory;
  audience: EmailAudience;
  /** The event that sends it. */
  trigger: string;
  /** Label of the single action button when the body contains a lone link. */
  actionLabel?: string;
  /** Inbox preview text. Falls back to the subject. */
  preheader?: string;
  /** False when the code exists and is seeded but nothing sends it yet. */
  wired: boolean;
  /** Who signs it. Defaults to the team; internal alerts have no signature. */
  signature?: SignatureKey;
  /** Security mail is always sent; the rest could be switched off per organisation later. */
  alwaysSend: boolean;
}

export const TEMPLATE_CATALOG: Readonly<Record<string, TemplateSpec>> = {
  email_verification: {
    category: "account_security",
    audience: "customer_user",
    trigger: "A person registers, or asks for a new confirmation link",
    actionLabel: "Confirm my email",
    preheader: "Confirm your email to finish creating your account",
    wired: true,
    alwaysSend: true,
  },
  account_lockout: {
    category: "account_security",
    audience: "customer_user",
    trigger: "Three wrong passwords in five minutes lock the account",
    actionLabel: "Reset my password",
    wired: true,
    alwaysSend: true,
  },
  mfa_enabled: {
    category: "account_security",
    audience: "customer_user",
    trigger: "Two-step sign-in is turned on",
    wired: true,
    alwaysSend: true,
  },
  password_changed: {
    category: "account_security",
    audience: "customer_user",
    trigger: "A password is changed or reset",
    actionLabel: "Reset my password",
    wired: true,
    alwaysSend: true,
  },
  password_reset: {
    category: "account_security",
    audience: "customer_user",
    trigger: "A person asks to reset their password",
    actionLabel: "Choose a new password",
    preheader: "This link works once and expires",
    wired: true,
    alwaysSend: true,
  },
  platform_staff_invitation: {
    category: "account_security",
    audience: "platform_staff",
    trigger: "Ops invites a staff member to the platform console",
    actionLabel: "Accept the invitation",
    wired: true,
    alwaysSend: true,
  },
  org_welcome: {
    category: "onboarding",
    audience: "customer_user",
    trigger: "A new organisation is created",
    actionLabel: "Continue setting up",
    wired: true,
    alwaysSend: true,
  },
  ops_new_organisation: {
    category: "ops_internal",
    audience: "ops_inbox",
    trigger: "A new organisation is created",
    signature: "none",
    wired: true,
    alwaysSend: true,
  },
  ops_contact_enquiry: {
    category: "ops_internal",
    audience: "ops_inbox",
    trigger: "Someone submits the website contact form",
    signature: "none",
    wired: true,
    alwaysSend: true,
  },
  ops_contact_ack: {
    category: "visitor_flow",
    audience: "enquirer",
    trigger: "Someone submits the website contact form",
    signature: "support",
    wired: true,
    alwaysSend: true,
  },
  invoice_issued: {
    category: "billing",
    audience: "customer_admins",
    trigger: "An invoice is issued",
    actionLabel: "View the invoice",
    signature: "billing",
    wired: true,
    alwaysSend: true,
  },
  invoice_reminder: {
    category: "billing",
    audience: "customer_admins",
    trigger: "An invoice is close to due or overdue",
    actionLabel: "View the invoice",
    signature: "billing",
    wired: true,
    alwaysSend: true,
  },
  pop_received_ack: {
    category: "billing",
    audience: "customer_admins",
    trigger: "A customer uploads proof of payment",
    signature: "billing",
    wired: true,
    alwaysSend: true,
  },
  pop_received_ops: {
    category: "ops_internal",
    audience: "ops_inbox",
    trigger: "A customer uploads proof of payment",
    signature: "none",
    wired: true,
    alwaysSend: true,
  },
  pop_rejected: {
    category: "billing",
    audience: "customer_admins",
    trigger: "Ops rejects a proof of payment",
    signature: "billing",
    wired: true,
    alwaysSend: true,
  },
  payment_confirmed: {
    category: "billing",
    audience: "customer_admins",
    trigger: "Ops confirms a payment",
    signature: "billing",
    wired: true,
    alwaysSend: true,
  },
  receipt_issued: {
    category: "billing",
    audience: "customer_admins",
    trigger: "A receipt is issued",
    signature: "billing",
    wired: true,
    alwaysSend: true,
  },
  subscription_activated: {
    category: "billing",
    audience: "customer_admins",
    trigger: "A subscription becomes active or trial",
    actionLabel: "Open the dashboard",
    signature: "billing",
    wired: true,
    alwaysSend: true,
  },
  suspension_warning: {
    category: "billing",
    audience: "customer_admins",
    trigger: "Service is about to be suspended",
    signature: "billing",
    wired: true,
    alwaysSend: true,
  },
  credit_note_issued: {
    category: "billing",
    audience: "customer_admins",
    trigger: "Billing staff issue a credit note",
    signature: "billing",
    wired: true,
    alwaysSend: true,
  },
  kyb_submitted_ack: {
    category: "verification",
    audience: "customer_user",
    trigger: "A customer submits business verification documents",
    wired: true,
    alwaysSend: true,
  },
  kyb_verified: {
    category: "verification",
    audience: "customer_admins",
    trigger: "Ops approves business verification",
    actionLabel: "Continue to go-live",
    wired: true,
    alwaysSend: true,
  },
  kyb_rejected: {
    category: "verification",
    audience: "customer_admins",
    trigger: "Ops rejects business verification",
    actionLabel: "Review the details",
    wired: true,
    alwaysSend: true,
  },
  host_visitor_arrived: {
    category: "visitor_flow",
    audience: "host",
    trigger: "A visitor checks in and names this host",
    wired: true,
    alwaysSend: true,
  },
  host_escalation: {
    category: "visitor_flow",
    audience: "host",
    trigger: "A host has not responded within the escalation wait",
    wired: true,
    alwaysSend: true,
  },
  visitor_prereg_invite: {
    category: "visitor_flow",
    audience: "visitor",
    trigger: "A host pre-registers a visitor and gives an email address",
    actionLabel: "Open my check-in",
    wired: true,
    alwaysSend: false,
  },
  visitor_visit_receipt: {
    category: "visitor_flow",
    audience: "visitor",
    trigger: "A visitor checks in and typed an email address",
    actionLabel: "Sign out when I leave",
    wired: true,
    alwaysSend: false,
  },
  visitor_signout_thanks: {
    category: "visitor_flow",
    audience: "visitor",
    trigger: "A visitor checks out and typed an email address at check-in",
    actionLabel: "Rate my visit",
    wired: true,
    alwaysSend: false,
  },
  support_ticket_ack: {
    category: "support",
    audience: "customer_user",
    trigger: "A customer opens a support ticket",
    signature: "support",
    wired: true,
    alwaysSend: true,
  },
  support_ticket_reply: {
    category: "support",
    audience: "customer_user",
    trigger: "Platform staff reply on a support ticket",
    signature: "support",
    wired: true,
    alwaysSend: true,
  },
  customer_breach_notice: {
    category: "support",
    audience: "customer_admins",
    trigger: "Buffr staff report a personal data breach affecting an organisation",
    signature: "support",
    wired: true,
    alwaysSend: true,
  },
  support_access_request: {
    category: "support",
    audience: "customer_admins",
    trigger: "Platform staff ask for access to an organisation",
    actionLabel: "Review the request",
    signature: "support",
    wired: true,
    alwaysSend: true,
  },
  scheduled_ops_daily_summary: {
    category: "report",
    audience: "ops_inbox",
    trigger: "Every day at 07:00 Windhoek",
    signature: "none",
    wired: true,
    alwaysSend: false,
  },
  scheduled_site_manager_digest: {
    category: "report",
    audience: "customer_admins",
    trigger: "Mondays at 07:00 Windhoek",
    wired: true,
    alwaysSend: false,
  },
  scheduled_board_compliance_monthly: {
    category: "report",
    audience: "customer_admins",
    trigger: "The 1st of each month at 07:00 Windhoek",
    wired: true,
    alwaysSend: false,
  },
};

export function specFor(code: string): TemplateSpec | undefined {
  return TEMPLATE_CATALOG[code];
}

export interface EmailPicture {
  file: string;
  alt: string;
}

/**
 * The picture every customer email carries, under the title. It is a resized copy of a website
 * marketing image in website/public/email, chosen by the kind of email. Mail to ops carries none.
 */
const PICTURES: Readonly<Partial<Record<EmailCategory, { hero: EmailPicture }>>> = {
  account_security: { hero: { file: "hero-home-reception.jpg", alt: "A reception desk with visitors checking in" } },
  onboarding: { hero: { file: "hero-home-reception.jpg", alt: "A reception desk with visitors checking in" } },
  billing: { hero: { file: "hero-pricing-planning.jpg", alt: "Planning and pricing" } },
  verification: { hero: { file: "hero-platform-governance.jpg", alt: "Compliance and governance overview" } },
  visitor_flow: { hero: { file: "hero-home-reception.jpg", alt: "A reception desk with visitors checking in" } },
  support: { hero: { file: "hero-contact-consultation.jpg", alt: "A consultation with the Buffr Checkpoint team" } },
  report: { hero: { file: "hero-status-operations.jpg", alt: "Operations overview" } },
};

export function picturesFor(code: string): { hero: EmailPicture } | null {
  const spec = TEMPLATE_CATALOG[code];
  return spec ? (PICTURES[spec.category] ?? null) : null;
}

export const ALL_PICTURE_FILES: readonly string[] = [
  ...new Set(Object.values(PICTURES).flatMap((p) => (p ? [p.hero.file] : []))),
];
