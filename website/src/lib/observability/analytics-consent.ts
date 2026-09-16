export const ANALYTICS_CONSENT_KEY = "bc_analytics_consent";

export type AnalyticsConsent = "accepted" | "declined";

export function readAnalyticsConsent(storage?: Pick<Storage, "getItem">): AnalyticsConsent | null {
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return null;
  const value = store.getItem(ANALYTICS_CONSENT_KEY);
  if (value === "accepted" || value === "declined") return value;
  return null;
}

export function writeAnalyticsConsent(
  value: AnalyticsConsent,
  storage?: Pick<Storage, "setItem">,
): void {
  const store = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!store) return;
  store.setItem(ANALYTICS_CONSENT_KEY, value);
}

export function hasAcceptedAnalyticsConsent(storage?: Pick<Storage, "getItem">): boolean {
  return readAnalyticsConsent(storage) === "accepted";
}
