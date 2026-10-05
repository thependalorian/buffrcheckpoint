import { cache } from "react";

import { headers } from "next/headers";

import { backendUrl } from "./backend-url";
import { getSessionToken } from "./session";
import { decodeSessionGate, GATE_HEADER, parseSessionGate, REQUEST_ID_HEADER, type SessionGate } from "./session-gate";

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
    skippedSteps?: string[];
    launchRoute?: "qr_first" | "kiosk" | null;
    /** Required steps not yet done for the chosen route (go-live blockers). */
    missingBeforeGolive?: string[];
    complete: boolean;
    /** Holds organisation.onboarding.manage; others see the waiting page until go-live. */
    canManage?: boolean;
    nextPath: string;
  };
  subscription?: { operationalUseAllowed: boolean; status: string | null };
}

/** Per-navigation id set by the proxy; forwarded so backend logs group calls by navigation. */
export async function getRequestId(): Promise<string | undefined> {
  try {
    return (await headers()).get(REQUEST_ID_HEADER) ?? undefined;
  } catch {
    // Outside a request scope (build-time or background work) there is no navigation id.
    return undefined;
  }
}

async function sessionFetch(path: string): Promise<Response | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const requestId = await getRequestId();
  return fetch(backendUrl(path), {
    headers: { Authorization: `Bearer ${token}`, ...(requestId ? { [REQUEST_ID_HEADER]: requestId } : {}) },
    cache: "no-store",
  });
}

// cache(): the layout and page of one render share a single backend call.
export const getCurrentUser = cache(async (): Promise<CurrentUserResult | null> => {
  const response = await sessionFetch("/auth/me");
  if (!response?.ok) return null;
  return (await response.json()) as CurrentUserResult;
});

/** Routing facts for layouts: the proxy's forwarded gate, or one backend call when absent (e.g. prefetch). */
export const getSessionGate = cache(async (): Promise<SessionGate | null> => {
  const forwarded = decodeSessionGate((await headers()).get(GATE_HEADER));
  if (forwarded) return forwarded;
  const response = await sessionFetch("/auth/session-gate");
  if (!response?.ok) return null;
  return parseSessionGate(await response.json());
});
