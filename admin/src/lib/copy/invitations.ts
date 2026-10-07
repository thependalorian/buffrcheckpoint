// Copy for sending an invitation link. Both addresses are optional, used once to send the link and never stored.

export const invitationsCopy = {
  emailLabel: "Visitor email (optional)",
  mobileLabel: "Visitor mobile number (optional)",
  deliveryHint: "Used once to send the check-in link, then forgotten. A text is billed to your organisation if the text add-on is on.",
  sent: {
    emailed: "The link was emailed.",
    texted: "The link was texted.",
    neither: "Nothing was sent. Share the link below with the visitor.",
  },
} as const;

export function deliverySummary(result: { emailed?: boolean; texted?: boolean }): string {
  const parts: string[] = [];
  if (result.emailed) parts.push(invitationsCopy.sent.emailed);
  if (result.texted) parts.push(invitationsCopy.sent.texted);
  return parts.length > 0 ? parts.join(" ") : invitationsCopy.sent.neither;
}
