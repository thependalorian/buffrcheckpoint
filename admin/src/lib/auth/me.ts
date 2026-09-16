import { backendUrl } from "./backend-url";
import { getSessionToken } from "./session";

export interface CurrentUserResult {
  user: { id: string; email: string; emailVerified: boolean; mfaEnabled: boolean };
  activeOrganisation: { id: string; name: string };
  memberships: Array<{ organisationId: string; organisationName: string; roles: string[]; siteScopes: string[] }>;
  permissions: string[];
  /** Set only under a Platform Ops Console break-glass support session — see auth.service.ts's me() support-session branch. */
  supportSession?: { sessionId: string; grantId?: string; expiresAt: string | null };
  onboarding?: {
    status: string;
    currentStep: string;
    completedSteps: string[];
    complete: boolean;
    nextPath: string;
  };
}

export async function getCurrentUser(): Promise<CurrentUserResult | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const response = await fetch(backendUrl("/auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;

  return (await response.json()) as CurrentUserResult;
}
