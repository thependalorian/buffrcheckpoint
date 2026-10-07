// The deadline for answering a data-subject request (draft Data Protection Bill s8(3)): one month from receipt, extendable once by a
// further month when the reasons are recorded. Derived from the status log, so it needs no schema of its own: receipt is the first
// log row, and an extension is a log row whose reason starts with "extension:".

export const EXTENSION_PREFIX = "extension:";
export const DUE_SOON_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ClockLogRow {
  occurredAt: Date;
  reason: string | null;
}

export type ClockState = "open" | "due_soon" | "overdue" | "closed";

export interface RequestClock {
  receivedAt: Date | null;
  dueAt: Date | null;
  extended: boolean;
  daysLeft: number | null;
  state: ClockState;
}

export function isExtensionReason(reason: string | null | undefined): boolean {
  return typeof reason === "string" && reason.startsWith(EXTENSION_PREFIX);
}

/** Adds calendar months in UTC, clamping to the last day of a shorter month (31 January plus one month is 28 or 29 February). */
export function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function requestClock(log: ClockLogRow[], isOpen: boolean, now: Date): RequestClock {
  if (log.length === 0) return { receivedAt: null, dueAt: null, extended: false, daysLeft: null, state: isOpen ? "open" : "closed" };
  const sorted = [...log].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const receivedAt = sorted[0].occurredAt;
  const extended = sorted.some((row) => isExtensionReason(row.reason));
  const dueAt = addMonthsUtc(receivedAt, extended ? 2 : 1);
  const daysLeft = Math.ceil((dueAt.getTime() - now.getTime()) / DAY_MS);
  if (!isOpen) return { receivedAt, dueAt, extended, daysLeft, state: "closed" };
  const state: ClockState = daysLeft < 0 ? "overdue" : daysLeft <= DUE_SOON_DAYS ? "due_soon" : "open";
  return { receivedAt, dueAt, extended, daysLeft, state };
}

export function canExtend(clock: RequestClock): boolean {
  return clock.state !== "closed" && !clock.extended;
}
