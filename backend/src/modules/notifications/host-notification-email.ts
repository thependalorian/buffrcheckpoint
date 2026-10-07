/**
 * Host notification HTML — visitor check-in alert for hosts.
 * Uses Buffr Checkpoint brand tokens (mustard / charcoal).
 */

import { brandedEmailLayout } from "./branded-email-layout";
import { picturesFor } from "./template-catalog";

export function buildHostNotificationHtml(input: {
  visitorName: string;
  siteLabel: string;
  visitorTypeLabel: string | null;
  companyName: string | null;
  purposeLabel: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  queueNumber: number | null;
  peopleAhead: number | null;
  hostDepartment: string | null;
}): string {
  // One-line values only: a visitor-typed value must not be able to break the layout or add a row.
  const one = (value: string) => value.replace(/\s+/g, " ").trim();
  const rows: string[] = [];
  if (input.visitorTypeLabel) rows.push(`Visitor type: ${one(input.visitorTypeLabel)}`);
  if (input.companyName) rows.push(`Organisation: ${one(input.companyName)}`);
  if (input.purposeLabel) rows.push(`Purpose: ${one(input.purposeLabel)}`);
  if (input.visitorPhone) rows.push(`Mobile: ${one(input.visitorPhone)}`);
  if (input.visitorEmail) rows.push(`Email: ${one(input.visitorEmail)}`);
  if (input.hostDepartment) rows.push(`Your unit: ${one(input.hostDepartment)}`);
  if (input.queueNumber != null) rows.push(`Queue ticket: #${input.queueNumber}`);
  if (input.peopleAhead != null) rows.push(`Waiting ahead: ${input.peopleAhead}`);

  const pictures = picturesFor("host_visitor_arrived");
  const site = (process.env.PUBLIC_WEBSITE_BASE_URL?.trim() || "https://buffrcheckpoint.com").replace(/\/$/, "");
  const lead = `Please come to reception to meet them${input.queueNumber != null ? ` (ticket #${input.queueNumber})` : ""}.`;
  return brandedEmailLayout({
    title: `${one(input.visitorName)} is at ${one(input.siteLabel)} reception`,
    bodyText: [lead, rows.join("\n")].filter(Boolean).join("\n\n"),
    preheader: `${one(input.visitorName)} is waiting at ${one(input.siteLabel)}`,
    heroImage: pictures ? { url: `${site}/email/${pictures.hero.file}`, alt: pictures.hero.alt } : null,
    greeting: null, // an alert, not a letter
    signature: null,
  });
}
