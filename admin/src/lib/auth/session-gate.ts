// Session gate shared by the proxy and server components. The proxy resolves
// it once per navigation (GET /auth/session-gate) and forwards the result as a
// request header, so layouts do not ask the backend again. The header is only
// a routing hint: the proxy strips any client-supplied copy, and the backend
// still authorises every data call.

export const GATE_HEADER = "x-bc-session-gate";
export const REQUEST_ID_HEADER = "x-bc-request-id";

export interface SessionGate {
  organisationName: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  onboardingComplete: boolean;
  canManageOnboarding: boolean;
  operationalUseAllowed: boolean;
  nextPath: string;
}

export function parseSessionGate(raw: unknown): SessionGate | null {
  if (!raw || typeof raw !== "object") return null;
  const gate = raw as Partial<SessionGate>;
  return {
    organisationName: typeof gate.organisationName === "string" ? gate.organisationName : "",
    emailVerified: gate.emailVerified === true,
    mfaEnabled: gate.mfaEnabled === true,
    onboardingComplete: gate.onboardingComplete === true,
    canManageOnboarding: gate.canManageOnboarding === true,
    operationalUseAllowed: gate.operationalUseAllowed === true,
    nextPath: typeof gate.nextPath === "string" && gate.nextPath.startsWith("/") ? gate.nextPath : "/onboarding",
  };
}

export function encodeSessionGate(gate: SessionGate): string {
  return encodeURIComponent(JSON.stringify(gate));
}

export function decodeSessionGate(header: string | null): SessionGate | null {
  if (!header) return null;
  try {
    return parseSessionGate(JSON.parse(decodeURIComponent(header)));
  } catch {
    return null;
  }
}
