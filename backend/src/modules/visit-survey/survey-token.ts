import { createHmac, timingSafeEqual } from "node:crypto";

// Proof that the person rating a visit is the one who just checked out. The
// public check-out response carries this token; it binds the visit id and an
// expiry, signed with a server secret. No table and no visitor data needed.

const SURVEY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function secret(): string {
  const key = process.env.QR_TOKEN_PEPPER || process.env.JWT_SECRET;
  if (!key) throw new Error("QR_TOKEN_PEPPER or JWT_SECRET must be set to sign survey tokens");
  return `visit-survey:${key}`;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Where the survey is answered; stored as the response's capture channel. */
export type SurveyChannel = "qr" | "kiosk";

export function createSurveyToken(visitId: string, channel: SurveyChannel, now = Date.now()): string {
  const payload = `${visitId}.${now + SURVEY_TOKEN_TTL_MS}.${channel}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

/** Returns the visit and channel, or null when the token is malformed, forged or expired. */
export function verifySurveyToken(token: string, now = Date.now()): { visitId: string; channel: SurveyChannel } | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const [visitId, expiresAt, channel] = payload.split(".");
  if (!visitId || !expiresAt || Number(expiresAt) < now) return null;
  return { visitId, channel: channel === "kiosk" ? "kiosk" : "qr" };
}
