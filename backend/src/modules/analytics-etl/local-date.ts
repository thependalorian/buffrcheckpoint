/** Calendar date (yyyy-MM-dd) of `instant` in an IANA time zone. */
export function localDateIn(instant: Date, timeZone: string): string {
  // en-CA formats as yyyy-MM-dd.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    instant,
  );
}

/** Add whole days to a yyyy-MM-dd date without time-zone drift. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Every yyyy-MM-dd from `from` to `to`, inclusive. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let cursor = from; cursor <= to && out.length < 3700; cursor = addDays(cursor, 1)) out.push(cursor);
  return out;
}

/** 0 = Monday ... 6 = Sunday, matching Postgres ISODOW - 1. */
export function isoWeekdayIndex(isoDate: string): number {
  return (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;
}
