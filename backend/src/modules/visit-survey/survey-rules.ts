/** Pure rules for the visit rating and its staff summary, kept apart so they can be tested without a database. */
export const MAX_COMMENT_LENGTH = 1000;
export const STAR_SCORES = [1, 2, 3, 4, 5] as const;

export class SurveyRuleError extends Error {}

/** Trims, removes control characters (keeping line breaks), caps nothing silently: too long is an error. Empty becomes null. */
export function normaliseComment(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new SurveyRuleError("Comment must be text");
  const text = value
    .replace(/\r\n?/g, "\n")
    // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  if (text.length === 0) return null;
  if (text.length > MAX_COMMENT_LENGTH)
    throw new SurveyRuleError(`Comment must be at most ${MAX_COMMENT_LENGTH} characters`);
  return text;
}

export function isStarScore(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export type Distribution = Record<1 | 2 | 3 | 4 | 5, number>;

export function emptyDistribution(): Distribution {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

/** Counts per score; scores outside 1 to 5 are ignored. */
export function distributionFrom(rows: Array<{ score: number; n: number }>): Distribution {
  const out = emptyDistribution();
  for (const row of rows)
    if (isStarScore(Number(row.score))) out[Number(row.score) as 1 | 2 | 3 | 4 | 5] += Number(row.n);
  return out;
}

export function summarise(distribution: Distribution): { responses: number; averageRating: number | null } {
  let responses = 0;
  let total = 0;
  for (const score of STAR_SCORES) {
    responses += distribution[score];
    total += score * distribution[score];
  }
  return { responses, averageRating: responses ? Math.round((total / responses) * 100) / 100 : null };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** yyyy-MM-dd bounds for the staff view. Defaults to the last `defaultDays` ending today; at most 366 days. */
export function periodBounds(
  from: string | undefined,
  to: string | undefined,
  today: string,
  addDays: (iso: string, days: number) => string,
  defaultDays = 28,
): { from: string; to: string } {
  const end = to ?? today;
  const start = from ?? addDays(end, -defaultDays);
  for (const date of [start, end]) {
    if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))
      throw new SurveyRuleError("Dates must be yyyy-MM-dd");
  }
  if (start > end) throw new SurveyRuleError("from must not be after to");
  if (addDays(start, 366) < end) throw new SurveyRuleError("The period can be at most 366 days");
  return { from: start, to: end };
}

export function clampLimit(value: number | undefined, fallback = 20, max = 100): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(value)));
}
