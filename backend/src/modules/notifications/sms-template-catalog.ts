/**
 * Every text message Checkpoint can send: what triggers it, who gets it, and the default wording. The wording is seeded into
 * `platform_notification_template` (channel sms) where ops edit it; the defaults here are the fallback and what the tests check.
 *
 * Rules every message here follows:
 *  - Neutral. A text appears on a lock screen, so it never carries a visitor's name, ID, host or purpose (risk register). It names the
 *    organisation so the visitor recognises the sender, and a reference.
 *  - One segment: at most 160 characters in GSM 7-bit, with the longest organisation name and links the system can produce (sms-text.ts).
 *  - Optional. Unlike email, a text costs money, so every one needs the organisation's SMS add-on, is billed to it by use, and has its own switch.
 */
export interface SmsTemplateSpec {
  audience: "visitor";
  /** The event that sends it. */
  trigger: string;
  /** False when the code is seeded but nothing sends it yet. */
  wired: boolean;
  /** Variables the body uses. */
  variables: readonly string[];
  /** Default wording, also the seeded template body. */
  defaultBody: string;
}

/** The codes, as constants, so the senders name a template without repeating its string. */
export const SMS_CODES = {
  visitReceipt: "visitor_visit_receipt_sms",
  signOutThanks: "visitor_signout_thanks_sms",
  preRegistrationInvite: "visitor_prereg_invite_sms",
} as const;

export const SMS_TEMPLATE_CATALOG: Readonly<Record<string, SmsTemplateSpec>> = {
  [SMS_CODES.visitReceipt]: {
    audience: "visitor",
    trigger: "A visitor checks in and typed a mobile number",
    wired: true,
    variables: ["organisationName", "visitReference", "signOutUrl"],
    defaultBody:
      "{{organisationName}}: visit recorded, ref {{visitReference}}. Sign out when you leave: {{signOutUrl}}",
  },
  [SMS_CODES.signOutThanks]: {
    audience: "visitor",
    trigger: "A visitor signs out and gave a mobile number at check-in",
    wired: true,
    variables: ["organisationName", "ratingUrl"],
    defaultBody: "Thank you for visiting {{organisationName}}. Rate your visit in one tap: {{ratingUrl}}",
  },
  [SMS_CODES.preRegistrationInvite]: {
    audience: "visitor",
    trigger: "A host pre-registers a visitor and gives a mobile number",
    wired: true,
    variables: ["organisationName", "visitDate", "checkInUrl"],
    defaultBody: "{{organisationName}} has pre-registered you for {{visitDate}}. Check in on arrival: {{checkInUrl}}",
  },
};

export function smsSpecFor(templateCode: string): SmsTemplateSpec | undefined {
  return SMS_TEMPLATE_CATALOG[templateCode];
}

export function smsTemplateCodes(): string[] {
  return Object.keys(SMS_TEMPLATE_CATALOG);
}
