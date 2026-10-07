import { COMPACT_TOKEN_LENGTH, createCompactToken, verifyCompactToken } from "../../common/crypto/compact-link-token";
import { createHmac, timingSafeEqual } from "node:crypto";

// A personal sign-out link for one visit, put in the visitor's receipt email. It binds the visit id and an expiry and is signed with a
// server secret, so it needs no table and no visitor data. It can only close the one visit it names, once; a second use is a no-op.

const SIGN_OUT_TTL_MS = 24 * 60 * 60 * 1000;

function secret(): string {
  const key = process.env.QR_TOKEN_PEPPER || process.env.JWT_SECRET;
  if (!key) throw new Error("QR_TOKEN_PEPPER or JWT_SECRET must be set to sign sign-out tokens");
  return `visit-sign-out:${key}`;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSignOutToken(visitId: string, now = Date.now()): string {
  const payload = `${visitId}.${now + SIGN_OUT_TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

/** The visit id, or null when the token is malformed, forged, expired, or a token made for another purpose (a rating token). */
export function verifySignOutToken(token: string, now = Date.now()): string | null {
  // The short form sent by text message. Same purpose, same 24-hour life, same one-visit scope.
  if (token.length === COMPACT_TOKEN_LENGTH) {
    const compact = verifyCompactToken(token, now);
    return compact?.kind === "o" ? compact.visitId : null;
  }
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined) return null;
  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const [visitId, expiresAt, ...rest] = payload.split(".");
  if (!visitId || !expiresAt || rest.length > 0 || Number(expiresAt) < now) return null;
  return visitId;
}

export function buildSignOutUrl(visitId: string): string {
  const base = (process.env.VISITOR_CHECKIN_BASE_URL ?? "https://buffrcheckpoint.com").replace(/\/$/, "");
  return `${base}/check-out?v=${encodeURIComponent(createSignOutToken(visitId))}`;
}

/** The short sign-out link for a text message: about 70 characters, opened through the website redirect at /o/. */
export function buildCompactSignOutUrl(visitId: string, now = Date.now()): string {
  const base = (process.env.VISITOR_CHECKIN_BASE_URL ?? "https://buffrcheckpoint.com").replace(/\/$/, "");
  return `${base}/o/${createCompactToken("o", visitId, now + SIGN_OUT_TTL_MS)}`;
}
