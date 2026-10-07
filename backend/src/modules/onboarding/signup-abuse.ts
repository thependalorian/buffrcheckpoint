// Sign-up abuse limits. Sign-up sends a verification email to whatever address is typed, so an attacker can make Checkpoint mail
// other people's business addresses (and a mail scanner that follows the link then "verifies" them). Observed 2026-10-05/06: 13
// random-named organisations in 24 hours from other people's company addresses.

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "gmx.com",
  "mweb.co.za",
  "iway.na",
  "mail.com",
]);

export interface SignupLimits {
  maxPendingPerDomain: number;
  maxPerHour: number;
}

export function signupLimitsFromEnv(env: NodeJS.ProcessEnv = process.env): SignupLimits {
  return {
    maxPendingPerDomain: Number(env.SIGNUP_MAX_PENDING_PER_DOMAIN ?? 2),
    maxPerHour: Number(env.SIGNUP_MAX_PER_HOUR ?? 20),
  };
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(domain);
}

export type SignupRefusal = "honeypot" | "domain_pending_limit" | "hourly_limit";

export function assessSignup(input: {
  honeypot?: string | null;
  email: string;
  pendingFromDomain: number;
  createdLastHour: number;
  limits: SignupLimits;
}): SignupRefusal | null {
  if (input.honeypot && input.honeypot.trim() !== "") return "honeypot";
  if (input.createdLastHour >= input.limits.maxPerHour) return "hourly_limit";
  if (!isFreeMailDomain(emailDomain(input.email)) && input.pendingFromDomain >= input.limits.maxPendingPerDomain) {
    return "domain_pending_limit";
  }
  return null;
}
