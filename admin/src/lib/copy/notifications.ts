// Copy for the email notification settings page.

export const notificationPrefsCopy = {
  title: "Email Notifications",
  description:
    "Choose which optional emails your organisation sends. Security, billing and verification emails are always sent and cannot be turned off.",
  columns: { email: "Email", sentWhen: "Sent when", to: "Goes to" },
  save: "Save",
  saved: "Saved",
  saveFailed: "Could not save your choices.",
  empty: "There are no optional emails to configure.",
  switchLabel: (name: string) => `Send: ${name}`,
  names: {
    visitor_prereg_invite: "Pre-registration invitation",
    visitor_visit_receipt: "Visit receipt",
    visitor_signout_thanks: "Sign-out thank you and rating link",
  } as Readonly<Record<string, string>>,
  audiences: {
    visitor: "The visitor, at the address you or they typed",
    customer_user: "Your users",
    customer_admins: "Your administrators",
    host: "The host",
  } as Readonly<Record<string, string>>,
  note: "Visitor emails are only sent to an address the visitor typed themselves or a host typed for them. Turning one off stops it for every site.",
} as const;

export function emailName(code: string): string {
  return notificationPrefsCopy.names[code] ?? code.replace(/_/g, " ");
}

export function emailAudience(audience: string): string {
  return notificationPrefsCopy.audiences[audience] ?? audience.replace(/_/g, " ");
}
