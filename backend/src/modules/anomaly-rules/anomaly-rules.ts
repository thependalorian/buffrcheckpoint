// Pure rule logic for the two v1 anomaly rules (migration 0045). Kept free of
// I/O so the thresholds and the after-hours window can be unit-tested.

export type AnomalyRuleCode = "repeat_phone_window" | "after_hours_restricted_zone";

export const ANOMALY_RULE_CODES: AnomalyRuleCode[] = ["repeat_phone_window", "after_hours_restricted_zone"];

export interface AnomalyRuleConfig {
  ruleCode: AnomalyRuleCode;
  enabled: boolean;
  thresholdInt: number;
  windowMinutes: number | null;
  windowStartLocal: string | null;
  windowEndLocal: string | null;
  isDefault: boolean;
}

/** Defaults used when a site has no configuration row: no site is unmonitored. */
export const ANOMALY_RULE_DEFAULTS: Record<AnomalyRuleCode, Omit<AnomalyRuleConfig, "ruleCode" | "isDefault">> = {
  repeat_phone_window: {
    enabled: true,
    thresholdInt: 3,
    windowMinutes: 30,
    windowStartLocal: null,
    windowEndLocal: null,
  },
  after_hours_restricted_zone: {
    enabled: true,
    thresholdInt: 1,
    windowMinutes: null,
    windowStartLocal: "07:00",
    windowEndLocal: "18:00",
  },
};

/** Zones at risk tier 3 (sensitive) or above count as restricted. */
export const RESTRICTED_TIER_MIN_SORT_ORDER = 3;

export function repeatPhoneTriggered(checkInsInWindow: number, config: AnomalyRuleConfig): boolean {
  return config.enabled && checkInsInWindow >= config.thresholdInt;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Site-local "HH:mm" of an instant. */
export function localTimeIn(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
  return parts;
}

/**
 * True when localTime falls outside the visitor-hours window [start, end).
 * Handles windows that cross midnight (e.g. 22:00-06:00).
 */
export function outsideVisitorHours(localTime: string, start: string, end: string): boolean {
  const t = minutesOf(localTime);
  const s = minutesOf(start);
  const e = minutesOf(end);
  if (s === e) return false;
  const inside = s < e ? t >= s && t < e : t >= s || t < e;
  return !inside;
}

export function afterHoursTriggered(input: {
  zoneTierSortOrder: number | null;
  localTime: string;
  config: AnomalyRuleConfig;
}): boolean {
  const { zoneTierSortOrder, localTime, config } = input;
  if (!config.enabled || zoneTierSortOrder === null || zoneTierSortOrder < RESTRICTED_TIER_MIN_SORT_ORDER) return false;
  if (!config.windowStartLocal || !config.windowEndLocal) return false;
  return outsideVisitorHours(localTime, config.windowStartLocal, config.windowEndLocal);
}
