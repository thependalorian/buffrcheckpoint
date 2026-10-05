import { Injectable } from "@nestjs/common";

import type { OnboardingStepCode } from "../onboarding/onboarding-steps";

/** How long a heartbeat keeps a step marked as being edited. */
export const PRESENCE_TTL_MS = 45_000;

export interface PresenceEntry {
  stepCode: OnboardingStepCode;
  userId: string;
  email: string;
  expiresAt: number;
}

/**
 * Advisory "someone is editing this step" map (buffrcheckpoint.md §11.9.15.9).
 * In-process, so it is only accurate while the API runs as a single instance,
 * the same caveat as the roster SSE emitter (§11.1b). It never blocks a
 * write: optimistic concurrency on the onboarding state row stays the guard.
 */
@Injectable()
export class OnboardingPresenceService {
  private readonly byOrganisation = new Map<string, Map<string, PresenceEntry>>();

  heartbeat(organisationId: string, entry: Omit<PresenceEntry, "expiresAt">, now: number = Date.now()): void {
    const org = this.byOrganisation.get(organisationId) ?? new Map<string, PresenceEntry>();
    org.set(entry.userId, { ...entry, expiresAt: now + PRESENCE_TTL_MS });
    this.byOrganisation.set(organisationId, org);
  }

  leave(organisationId: string, userId: string): void {
    this.byOrganisation.get(organisationId)?.delete(userId);
  }

  /** Live entries for the organisation, excluding the caller. */
  others(organisationId: string, userId: string, now: number = Date.now()): PresenceEntry[] {
    const org = this.byOrganisation.get(organisationId);
    if (!org) return [];
    const live: PresenceEntry[] = [];
    for (const [key, entry] of org) {
      if (entry.expiresAt <= now) {
        org.delete(key);
      } else if (entry.userId !== userId) {
        live.push(entry);
      }
    }
    if (org.size === 0) this.byOrganisation.delete(organisationId);
    return live;
  }
}
