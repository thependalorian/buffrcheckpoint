// Per-process cache for session resolution (/auth/me, /auth/session-gate).
// Each admin navigation used to cost 8-10 sequential queries per call; a short
// TTL plus explicit invalidation keeps answers fresh without that fan-out.
// Valid while the API runs as a single instance (same constraint as the
// roster stream emitter); a second replica would need a shared store.

const DEFAULT_TTL_MS = Number(process.env.SESSION_CACHE_TTL_MS ?? 30_000);
const MAX_ENTRIES = 5_000;

interface Entry {
  value: unknown;
  expiresAt: number;
  userId: string;
  organisationId: string;
}

class SessionCache {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly ttlMs: number) {}

  async getOrLoad<T>(kind: string, userId: string, organisationId: string, load: () => Promise<T>): Promise<T> {
    const key = `${kind}:${userId}:${organisationId}`;
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;

    const value = await load();
    if (this.ttlMs > 0) {
      if (this.entries.size >= MAX_ENTRIES) this.evictExpiredOrOldest();
      this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs, userId, organisationId });
    }
    return value;
  }

  /** MFA enrolment, email verification, role change, login. */
  invalidateUser(userId: string): void {
    for (const [key, entry] of this.entries) {
      if (entry.userId === userId) this.entries.delete(key);
    }
  }

  /** Onboarding transition, subscription status change. */
  invalidateOrganisation(organisationId: string): void {
    for (const [key, entry] of this.entries) {
      if (entry.organisationId === organisationId) this.entries.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  private evictExpiredOrOldest(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
    if (this.entries.size >= MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value;
      if (oldest) this.entries.delete(oldest);
    }
  }
}

export const sessionCache = new SessionCache(DEFAULT_TTL_MS);
