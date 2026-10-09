import { type EmailSignature } from "./email-compose";
import { type EmailBlock, structureBody } from "./email-structure";

/**
 * Shared Buffr Checkpoint transactional email shell.
 * Brand tokens: mustard #E0B000, charcoal #111111, light #F5F5F5 (buffrcheckpoint/branding/README.md).
 * Plain text is the canonical body; this lays it out for HTML clients using the structure found in it (email-structure.ts).
 *
 * Dark mode. Gmail's apps recolour mail themselves: light backgrounds go dark and dark text goes light, together. Forcing the
 * background to stay light while the text still flips made the text vanish, so nothing here fights that: every colour is set plainly
 * and flips as a pair. Two things are made safe on purpose: the logo travels on its own light plate (the wordmark is black), and the
 * button is charcoal with mustard text and a mustard border, which keeps its contrast whether or not the app recolours it. Apple Mail and
 * other clients that honour prefers-color-scheme get an explicit dark palette from the style block.
 */

const MUSTARD = "#E0B000";
const CHARCOAL = "#111111";
const LIGHT = "#F5F5F5";
const MUTED = "#5C5C5C";
const RULE = "#E5E5E5";

export const DEFAULT_EMAIL_LOGO = "https://buffrcheckpoint.com/branding/email-logo.png";

export interface EmailLayoutInput {
  title: string;
  bodyText: string;
  preheader?: string;
  logoUrl?: string | null;
  /** Label for the button when the body has a lone link. */
  actionLabel?: string;
  /** A picture under the title, from the website's marketing assets. */
  heroImage?: { url: string; alt: string } | null;
  /** "Hello Maria," or "Hello,". Null for none (internal alerts). */
  greeting?: string | null;
  /** Who is writing. Null for none (internal alerts). Defaults to the team. */
  signature?: EmailSignature | null;
}

const ground = (hex: string) => `background-color:${hex};`;

export function brandedEmailLayout(input: EmailLayoutInput): string {
  const logoUrl = input.logoUrl?.trim() || process.env.PUBLIC_BRAND_LOGO_URL?.trim() || DEFAULT_EMAIL_LOGO;
  const contact = process.env.PUBLIC_CONTACT_EMAIL?.trim() || "team@buffranalytics.com";
  const website = (process.env.PUBLIC_WEBSITE_BASE_URL?.trim() || "https://buffrcheckpoint.com").replace(/\/$/, "");
  const blocks = structureBody(input.bodyText, { actionLabel: input.actionLabel });
  // null means "no signature" (internal alerts); only undefined falls back to the default team signature.
  const signature = input.signature === null ? null : (input.signature ?? { name: "The Buffr Checkpoint team" });
  const greeting = input.greeting ?? null;

  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escapeHtml(input.title)}</title>
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
@media (prefers-color-scheme: dark){
  .bc-outer{background-color:#111111 !important;}
  .bc-card{background-color:#1C1C1E !important;border-color:#3A3A3C !important;}
  .bc-tx{color:#F2F2F2 !important;}
  .bc-muted{color:#B8B8B8 !important;}
  .bc-rule{border-color:#3A3A3C !important;}
  .bc-soft{background-color:#2A2A2C !important;}
  .bc-link{color:#F2F2F2 !important;}
}
</style>
</head>
<body style="margin:0;padding:0;${ground(LIGHT)}font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" bgcolor="${LIGHT}">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${LIGHT}" class="bc-outer" style="${ground(LIGHT)}padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" class="bc-card" style="max-width:560px;${ground("#FFFFFF")}border-radius:6px;overflow:hidden;border:1px solid ${RULE};">
          <tr><td style="height:5px;line-height:5px;font-size:0;${ground(MUSTARD)}" bgcolor="${MUSTARD}">&nbsp;</td></tr>
          <tr>
            <td style="padding:24px 28px 4px;">
              <a href="${escapeHtml(website)}" style="text-decoration:none;"><img src="${escapeHtml(logoUrl)}" alt="Buffr Checkpoint" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;" /></a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 4px;">
              <h1 class="bc-tx" style="margin:0;font-size:22px;line-height:1.3;color:${CHARCOAL};font-weight:700;">${escapeHtml(input.title)}</h1>
            </td>
          </tr>
          ${input.heroImage ? `<tr><td style="padding:12px 28px 0;"><img src="${escapeHtml(input.heroImage.url)}" alt="${escapeHtml(input.heroImage.alt)}" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:4px;" /></td></tr>` : ""}
          <tr>
            <td style="padding:12px 28px 8px;">
              ${greeting ? `<p class="bc-tx" style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${CHARCOAL};">${escapeHtml(greeting)}</p>` : ""}
              ${blocks.map(renderBlock).join("")}
              ${signature ? renderSignature(signature) : ""}
            </td>
          </tr>
          <tr>
            <td class="bc-soft bc-muted" style="padding:18px 28px;${ground(LIGHT)}font-size:12px;line-height:1.6;color:${MUTED};" bgcolor="${LIGHT}">
              <strong class="bc-tx" style="color:${CHARCOAL};">Buffr Checkpoint</strong> &middot; Visitor and access management, Namibia<br />
              Questions? Reply to this email or write to <a href="mailto:${escapeHtml(contact)}" class="bc-link" style="color:${CHARCOAL};">${escapeHtml(contact)}</a>.<br />
              <a href="${escapeHtml(website)}" class="bc-muted" style="color:${MUTED};">${escapeHtml(website.replace(/^https?:\/\//, ""))}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderSignature(signature: EmailSignature): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:10px 0 18px;"><tr><td class="bc-tx" style="border-left:4px solid ${MUSTARD};padding:2px 0 2px 12px;font-size:14px;line-height:1.5;color:${CHARCOAL};">Kind regards,<br /><strong>${escapeHtml(signature.name)}</strong>${signature.role ? `<br /><span class="bc-muted" style="color:${MUTED};">${escapeHtml(signature.role)}</span>` : ""}</td></tr></table>`;
}

function renderBlock(block: EmailBlock): string {
  switch (block.kind) {
    case "paragraph":
      return `<p class="bc-tx" style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${CHARCOAL};">${linkifyUrls(escapeHtml(block.text).replace(/\n/g, "<br />"))}</p>`;
    case "facts":
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="bc-rule" style="margin:0 0 18px;border:1px solid ${RULE};border-radius:4px;border-collapse:separate;">${block.rows
        .map(
          (row, index) =>
            `<tr><td class="bc-muted bc-rule" style="padding:9px 12px;width:38%;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;${index ? `border-top:1px solid ${RULE};` : ""}vertical-align:top;">${escapeHtml(row.label)}</td><td class="bc-tx bc-rule" style="padding:9px 12px;font-size:14px;color:${CHARCOAL};${index ? `border-top:1px solid ${RULE};` : ""}vertical-align:top;">${linkifyUrls(escapeHtml(row.value))}</td></tr>`,
        )
        .join("")}</table>`;
    case "image":
      return `<img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:4px;margin:0 0 16px;" />`;
    case "action":
      return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 10px;"><tr><td bgcolor="${CHARCOAL}" style="${ground(CHARCOAL)}border:2px solid ${MUSTARD};border-radius:6px;"><a href="${escapeHtml(block.url)}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:700;color:${MUSTARD};text-decoration:none;">${escapeHtml(block.label)}</a></td></tr></table><p class="bc-muted" style="margin:0 0 18px;font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all;">If the button does not work, copy this link into your browser:<br /><a href="${escapeHtml(block.url)}" class="bc-link" style="color:${CHARCOAL};text-decoration:underline;">${escapeHtml(block.url)}</a></p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag} class="bc-tx" style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.55;color:${CHARCOAL};">${block.items.map((item) => `<li style="margin:0 0 6px;">${linkifyUrls(escapeHtml(item))}</li>`).join("")}</${tag}>`;
    }
    case "callout":
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 18px;"><tr><td class="bc-soft bc-tx" style="padding:12px 14px;${ground(LIGHT)}border-left:4px solid ${block.tone === "security" ? MUSTARD : MUSTARD};font-size:14px;line-height:1.55;color:${CHARCOAL};" bgcolor="${LIGHT}">${linkifyUrls(escapeHtml(block.text).replace(/\n/g, "<br />"))}</td></tr></table>`;
  }
}

/** Convert plain URLs in already-escaped HTML into anchors. */
function linkifyUrls(escapedHtml: string): string {
  return escapedHtml.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" class="bc-link" style="color:#111111;text-decoration:underline;">$1</a>',
  );
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const BRAND_COLORS = { mustard: MUSTARD, charcoal: CHARCOAL, light: LIGHT, muted: MUTED } as const;
