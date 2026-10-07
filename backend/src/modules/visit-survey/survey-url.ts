import { createCompactSurveyToken, createSurveyToken, type SurveyChannel } from "./survey-token";

/**
 * The public page where a visitor rates a visit, with the signed token in the link. Used by the sign-out thank-you email so the
 * visitor can rate from their inbox. The token is the same one the check-out response carries: it binds the visit and expires after
 * 24 hours, and the rating is only accepted once the visit is checked out.
 */
export function buildSurveyUrl(visitId: string, channel: SurveyChannel = "qr", now = Date.now()): string {
  const base = (process.env.PUBLIC_WEBSITE_BASE_URL?.trim() || "https://buffrcheckpoint.com").replace(/\/$/, "");
  return `${base}/rate?t=${encodeURIComponent(createSurveyToken(visitId, channel, now))}`;
}

/** The short rating link for a text message: about 70 characters, opened through the website redirect at /r/. */
export function buildCompactSurveyUrl(visitId: string, now = Date.now()): string {
  const base = (process.env.PUBLIC_WEBSITE_BASE_URL?.trim() || "https://buffrcheckpoint.com").replace(/\/$/, "");
  return `${base}/r/${createCompactSurveyToken(visitId, now)}`;
}
