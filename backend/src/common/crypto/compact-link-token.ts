import { createHmac, timingSafeEqual } from "node:crypto";

// A short signed link token for text messages. The email links carry a base64 payload and a 43-character signature (about 110
// characters), which cannot share a 160-character SMS with any wording. This form is fixed width, 41 characters:
//   kind (1) + visit id as 16 bytes in base64url (22) + expiry in Unix minutes, base 36, zero padded (6) + signature (12)
// The signature is the first 72 bits of an HMAC-SHA256 over kind, visit and expiry. It binds one visit, one purpose and an expiry,
// needs no table, and is checked in constant time. The kind keeps a sign-out token from ever being accepted as a rating token.

export type CompactLinkKind = "o" | "r";

const VISIT_CHARS = 22;
const EXPIRY_CHARS = 6;
const MAC_CHARS = 12;
export const COMPACT_TOKEN_LENGTH = 1 + VISIT_CHARS + EXPIRY_CHARS + MAC_CHARS;

function secret(): string {
  const key = process.env.QR_TOKEN_PEPPER || process.env.JWT_SECRET;
  if (!key) throw new Error("QR_TOKEN_PEPPER or JWT_SECRET must be set to sign link tokens");
  return `compact-link:${key}`;
}

function mac(signed: string): string {
  return createHmac("sha256", secret()).update(signed).digest("base64url").slice(0, MAC_CHARS);
}

function uuidToBase64Url(uuid: string): string | null {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) return null;
  return Buffer.from(hex, "hex").toString("base64url");
}

function base64UrlToUuid(value: string): string | null {
  if (!/^[A-Za-z0-9_-]{22}$/.test(value)) return null;
  const hex = Buffer.from(value, "base64url").toString("hex");
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createCompactToken(kind: CompactLinkKind, visitId: string, expiresAtMs: number): string {
  const visit = uuidToBase64Url(visitId);
  if (!visit) throw new Error("visitId must be a UUID");
  const expiry = Math.floor(expiresAtMs / 60_000)
    .toString(36)
    .padStart(EXPIRY_CHARS, "0");
  const signed = `${kind}${visit}${expiry}`;
  return `${signed}${mac(signed)}`;
}

/** The visit id and kind, or null when the token is malformed, forged or expired. */
export function verifyCompactToken(token: string, now = Date.now()): { kind: CompactLinkKind; visitId: string } | null {
  if (token.length !== COMPACT_TOKEN_LENGTH) return null;
  const kind = token[0];
  if (kind !== "o" && kind !== "r") return null;
  const signed = token.slice(0, COMPACT_TOKEN_LENGTH - MAC_CHARS);
  const given = Buffer.from(token.slice(COMPACT_TOKEN_LENGTH - MAC_CHARS));
  const expected = Buffer.from(mac(signed));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const visitId = base64UrlToUuid(signed.slice(1, 1 + VISIT_CHARS));
  const expiryMinutes = Number.parseInt(signed.slice(1 + VISIT_CHARS), 36);
  if (!visitId || !Number.isFinite(expiryMinutes) || expiryMinutes * 60_000 < now) return null;
  return { kind, visitId };
}
