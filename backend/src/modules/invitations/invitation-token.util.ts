import { createHmac, randomBytes } from "node:crypto";

export function generateOpaqueInvitationToken(): string {
  return randomBytes(24).toString("base64url");
}

export function invitationTokenHmac(token: string): string {
  const pepper = process.env.QR_TOKEN_PEPPER ?? "dev-qr-token-pepper-change-me";
  return createHmac("sha256", pepper).update(`invitation:${token}`).digest("hex");
}

export function buildInvitationCheckInUrl(token: string): string {
  const base = process.env.VISITOR_CHECKIN_BASE_URL ?? "https://buffrcheckpoint.com";
  return `${base}/check-in?inv=${encodeURIComponent(token)}`;
}
