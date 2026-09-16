/**
 * Host notification HTML — BIAN Business Support / Communication & Education
 * analogue. Plain text remains the canonical body for adapters that ignore HTML.
 */

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
  const accent = input.brandColour?.trim() || "#CF1161";
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
        `<tr><td style="padding:6px 12px 6px 0;color:#705C67;font-size:14px;vertical-align:top;">${label}</td>` +
        `<td style="padding:6px 0;color:#3D1152;font-size:14px;font-weight:600;">${value}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8F5F6;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F5F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EDE6E8;">
          <tr>
            <td style="height:4px;background:${escapeHtml(accent)};"></td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:${escapeHtml(accent)};font-family:system-ui,sans-serif;">
                Visitor waiting
              </p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#3D1152;font-weight:600;">
                ${escapeHtml(input.visitorName)} is at ${escapeHtml(input.siteLabel)} reception
              </h1>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#705C67;font-family:system-ui,sans-serif;">
                Please come to reception to meet them${input.queueNumber != null ? ` (ticket #${input.queueNumber})` : ""}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;font-family:system-ui,sans-serif;">
                ${detailRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#FDEEF2;font-size:12px;color:#675C62;font-family:system-ui,sans-serif;">
              Sent by Buffr Checkpoint · host notification (Communication)
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
