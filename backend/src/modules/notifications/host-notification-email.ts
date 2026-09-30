/**
 * Host notification HTML — visitor check-in alert for hosts.
 * Uses Buffr Checkpoint brand tokens (mustard / charcoal).
 */

import { BRAND_COLORS, escapeHtml } from "./branded-email-layout";

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
  brandColour?: string | null;
}): string {
  const accent = input.brandColour?.trim() || BRAND_COLORS.mustard;
  const rows: Array<[string, string]> = [];
  if (input.visitorTypeLabel) rows.push(["Visitor type", escapeHtml(input.visitorTypeLabel)]);
  if (input.companyName) rows.push(["Organisation", escapeHtml(input.companyName)]);
  if (input.purposeLabel) rows.push(["Purpose", escapeHtml(input.purposeLabel)]);
  if (input.visitorPhone) rows.push(["Mobile", escapeHtml(input.visitorPhone)]);
  if (input.visitorEmail) rows.push(["Email", escapeHtml(input.visitorEmail)]);
  if (input.hostDepartment) rows.push(["Your unit", escapeHtml(input.hostDepartment)]);
  if (input.queueNumber != null) rows.push(["Queue ticket", `#${input.queueNumber}`]);
  if (input.peopleAhead != null) rows.push(["Waiting ahead", String(input.peopleAhead)]);

  const detailRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:${BRAND_COLORS.muted};font-size:14px;vertical-align:top;">${label}</td>` +
        `<td style="padding:6px 0;color:${BRAND_COLORS.charcoal};font-size:14px;font-weight:600;">${value}</td></tr>`,
    )
    .join("");

  const logoUrl =
    process.env.PUBLIC_BRAND_LOGO_URL?.trim() ||
    "https://www.buffrcheckpoint.com/branding/logo-horizontal.png";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${BRAND_COLORS.light};font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND_COLORS.light};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #E5E5E5;">
          <tr>
            <td style="height:4px;background:${escapeHtml(accent)};"></td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px;">
              <img src="${escapeHtml(logoUrl)}" alt="Buffr Checkpoint" width="160" style="display:block;max-width:160px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:${escapeHtml(accent)};">
                Visitor waiting
              </p>
              <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;color:${BRAND_COLORS.charcoal};font-weight:600;">
                ${escapeHtml(input.visitorName)} is at ${escapeHtml(input.siteLabel)} reception
              </h1>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:${BRAND_COLORS.muted};">
                Please come to reception to meet them${input.queueNumber != null ? ` (ticket #${input.queueNumber})` : ""}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                ${detailRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:${BRAND_COLORS.light};font-size:12px;color:${BRAND_COLORS.muted};">
              Sent by Buffr Checkpoint · host notification
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
