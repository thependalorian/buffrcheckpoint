// Pure decision rules for the retention disposition job. Kept free of the
// database so the parts that decide what gets destroyed are unit-tested.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PolicyRow {
  siteId: string | null;
  retentionDays: number;
  version: number;
}

export interface EffectivePolicies {
  organisationDefaultDays: number | null;
  siteDays: Map<string, number>;
}

// Retention policies are versioned per scope (a change is a new row with
// version + 1). The effective policy for a scope is its highest version.
export function effectivePolicies(rows: PolicyRow[]): EffectivePolicies {
  const best = new Map<string | null, PolicyRow>();
  for (const row of rows) {
    const current = best.get(row.siteId);
    if (!current || row.version > current.version) best.set(row.siteId, row);
  }
  const siteDays = new Map<string, number>();
  for (const [siteId, row] of best) {
    if (siteId !== null) siteDays.set(siteId, row.retentionDays);
  }
  return { organisationDefaultDays: best.get(null)?.retentionDays ?? null, siteDays };
}

// Site policy wins over the organisation default. No policy at all means no
// disposition: the job never invents a retention period.
export function retentionDaysFor(siteId: string, policies: EffectivePolicies): number | null {
  return policies.siteDays.get(siteId) ?? policies.organisationDefaultDays;
}

export function isExpired(checkedOutAt: Date, retentionDays: number, now: Date): boolean {
  return checkedOutAt.getTime() < now.getTime() - retentionDays * DAY_MS;
}

export interface HoldableVisit {
  id: string;
  siteId: string;
  visitorId: string | null;
  checkedInAt: Date;
}

const KNOWN_SCOPE_KEYS = new Set(["siteId", "visitId", "visitorId", "dateRangeStart", "dateRangeEnd"]);

function parseDate(value: unknown): Date | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "invalid" : parsed;
}

// Legal hold scopes are free-form JSON ({ siteId, dateRangeStart,
// dateRangeEnd } today). Every criterion present must match for the hold to
// cover a visit; an absent criterion matches everything. Anything the job
// cannot interpret (an unknown key, a malformed date) fails closed: the hold
// is treated as covering the whole organisation, because wrongly destroying
// held evidence is the one outcome that cannot be undone.
export function holdCoversVisit(scope: Record<string, unknown>, visit: HoldableVisit): boolean {
  if (Object.keys(scope).some((key) => !KNOWN_SCOPE_KEYS.has(key))) return true;

  const start = parseDate(scope.dateRangeStart);
  const end = parseDate(scope.dateRangeEnd);
  if (start === "invalid" || end === "invalid") return true;

  if (scope.siteId !== undefined && scope.siteId !== visit.siteId) return false;
  if (scope.visitId !== undefined && scope.visitId !== visit.id) return false;
  if (scope.visitorId !== undefined && scope.visitorId !== visit.visitorId) return false;
  if (start && visit.checkedInAt < start) return false;
  if (end) {
    // A date-only end ("2026-03-31") covers the whole of that day; a full
    // timestamp end is inclusive.
    const dateOnly = typeof scope.dateRangeEnd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(scope.dateRangeEnd);
    const beyondEnd = dateOnly ? visit.checkedInAt.getTime() >= end.getTime() + DAY_MS : visit.checkedInAt > end;
    if (beyondEnd) return false;
  }
  return true;
}
