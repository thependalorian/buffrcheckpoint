/**
 * Shared Buffr Checkpoint transactional email shell.
 * Brand tokens: mustard #E0B000, charcoal #111111, light #F5F5F5
 * (buffrcheckpoint/branding/README.md). Plain-text body is canonical;
 * this wraps it for HTML clients.
 */

const MUSTARD = "#E0B000";
const CHARCOAL = "#111111";
const LIGHT = "#F5F5F5";
const MUTED = "#5C5C5C";

export function brandedEmailLayout(input: {
  title: string;
  bodyText: string;
  preheader?: string;
  logoUrl?: string | null;
}): string {
  const logoUrl =
    input.logoUrl?.trim() ||
    process.env.PUBLIC_BRAND_LOGO_URL?.trim() ||
    "https://www.buffrcheckpoint.com/branding/logo-horizontal.png";
  const paragraphs = input.bodyText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const withBreaks = escapeHtml(block).replace(/\n/g, "<br />");
      const linked = linkifyUrls(withBreaks);
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${CHARCOAL};">${linked}</p>`;
    })
    .join("");

  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${LIGHT};font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${LIGHT};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #E5E5E5;">
          <tr><td style="height:4px;background:${MUSTARD};"></td></tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <img src="${escapeHtml(logoUrl)}" alt="Buffr Checkpoint" width="180" style="display:block;max-width:180px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px;">
              <h1 style="margin:0;font-size:20px;line-height:1.35;color:${CHARCOAL};font-weight:600;">
                ${escapeHtml(input.title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              ${paragraphs}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:${LIGHT};font-size:12px;line-height:1.5;color:${MUTED};">
              Buffr Checkpoint · Buffr Financial Services CC<br />
              Namibia · <a href="mailto:team@buffranalytics.com" style="color:${CHARCOAL};">team@buffranalytics.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Convert plain URLs in already-escaped HTML into anchors. */
function linkifyUrls(escapedHtml: string): string {
  return escapedHtml.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#111111;text-decoration:underline;">$1</a>',
  );
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const BRAND_COLORS = { mustard: MUSTARD, charcoal: CHARCOAL, light: LIGHT, muted: MUTED } as const;
