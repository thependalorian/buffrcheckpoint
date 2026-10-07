import type { SessionAudience } from "./session-audience";

/**
 * MFA policy for customer sign-ins: not required while an organisation is being set up, required as soon as onboarding is complete.
 * Staff sessions (ops) are always MFA-verified elsewhere, and a support session acts under the platform user's own MFA.
 *
 * While the organisation is live, a customer user without MFA may reach only the account endpoints they need to set it up.
 */
export const MFA_SETUP_ALLOWED_PREFIXES = ["/auth/", "/health"] as const;

export interface MfaGateInput {
  audience: SessionAudience;
  mfaEnabled: boolean;
  hasSupportSession: boolean;
  path: string;
  organisationLive: boolean;
}

export function mfaSetupRequired(input: MfaGateInput): boolean {
  if (input.audience !== "admin" || input.hasSupportSession) return false;
  if (input.mfaEnabled || !input.organisationLive) return false;
  return !MFA_SETUP_ALLOWED_PREFIXES.some(
    (prefix) => input.path === prefix.replace(/\/$/, "") || input.path.startsWith(prefix),
  );
}

export const MFA_SETUP_REQUIRED_MESSAGE = "Set up multi-factor authentication to continue (mfa_setup_required)";
