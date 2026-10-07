// Copy for the email and text-message notification settings page.

export const notificationPrefsCopy = {
  title: "Email and Text Notifications",
  description:
    "Choose which optional emails and text messages your organisation sends. Security, billing and verification emails are always sent and cannot be turned off.",
  columns: { email: "Email", sentWhen: "Sent when", to: "Goes to" },
  save: "Save",
  saved: "Saved",
  saveFailed: "Could not save your choices.",
  empty: "There are no optional messages to configure.",
  switchLabel: (name: string) => `Send: ${name}`,
  names: {
    visitor_prereg_invite: "Pre-registration invitation",
    visitor_visit_receipt: "Visit receipt",
    visitor_signout_thanks: "Sign-out thank you and rating link",
    visitor_visit_receipt_sms: "Visit receipt by text message",
    visitor_signout_thanks_sms: "Sign-out thank you and rating link by text message",
    visitor_prereg_invite_sms: "Pre-registration invitation by text message",
  } as Readonly<Record<string, string>>,
  audiences: {
    visitor: "The visitor, at the address you or they typed",
    customer_user: "Your users",
    customer_admins: "Your administrators",
    host: "The host",
  } as Readonly<Record<string, string>>,
  note: "Visitor emails are only sent to an address the visitor typed themselves or a host typed for them. Turning one off stops it for every site.",
  smsNote:
    "Text messages are part of the SMS add-on. Without the add-on, or once its monthly allowance is used, no text is sent even when a switch is on. Texts go only to a mobile number the visitor typed, and never carry a name, host or purpose.",
  smsAudience: "The visitor, at the mobile number they typed",
} as const;

export function emailName(code: string): string {
  return notificationPrefsCopy.names[code] ?? code.replace(/_/g, " ");
}

export function emailAudience(audience: string, channel: "email" | "sms" = "email"): string {
  if (channel === "sms" && audience === "visitor") return notificationPrefsCopy.smsAudience;
  return notificationPrefsCopy.audiences[audience] ?? audience.replace(/_/g, " ");
}
