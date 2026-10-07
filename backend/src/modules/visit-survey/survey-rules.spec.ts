import { addDays } from "../analytics-etl/local-date";
import {
  clampLimit,
  distributionFrom,
  isStarScore,
  MAX_COMMENT_LENGTH,
  normaliseComment,
  periodBounds,
  SurveyRuleError,
  summarise,
} from "./survey-rules";

describe("normaliseComment", () => {
  it("treats missing and blank comments as no comment", () => {
    for (const value of [undefined, null, "", "   \n\t "]) expect(normaliseComment(value)).toBeNull();
  });

  it("trims, keeps line breaks and drops control characters", () => {
    expect(normaliseComment("  Quick\r\nservice\u0000 \u0007 ")).toBe("Quick\nservice");
  });

  it("accepts exactly the maximum and refuses one more", () => {
    expect(normaliseComment("a".repeat(MAX_COMMENT_LENGTH))).toHaveLength(MAX_COMMENT_LENGTH);
    expect(() => normaliseComment("a".repeat(MAX_COMMENT_LENGTH + 1))).toThrow(SurveyRuleError);
  });

  it("refuses non-text", () => {
    expect(() => normaliseComment(5)).toThrow(SurveyRuleError);
    expect(() => normaliseComment({ a: 1 })).toThrow(SurveyRuleError);
  });
});

describe("star scores", () => {
  it("accepts whole numbers 1 to 5 only", () => {
    for (const ok of [1, 2, 3, 4, 5]) expect(isStarScore(ok)).toBe(true);
    for (const bad of [0, 6, 2.5, -1, "3", null, undefined, NaN]) expect(isStarScore(bad)).toBe(false);
  });

  it("builds a full 1 to 5 distribution and ignores scores outside it", () => {
    const d = distributionFrom([
      { score: 5, n: 3 },
      { score: 1, n: 1 },
      { score: 9, n: 7 },
    ]);
    expect(d).toEqual({ 1: 1, 2: 0, 3: 0, 4: 0, 5: 3 });
  });

  it("averages to two decimals and returns null with no responses", () => {
    expect(summarise({ 1: 1, 2: 0, 3: 0, 4: 0, 5: 3 })).toEqual({ responses: 4, averageRating: 4 });
    expect(summarise({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 })).toEqual({ responses: 3, averageRating: 4 });
    expect(summarise({ 1: 1, 2: 1, 3: 0, 4: 0, 5: 1 })).toEqual({ responses: 3, averageRating: 2.67 });
    expect(summarise({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })).toEqual({ responses: 0, averageRating: null });
  });
});

describe("periodBounds", () => {
  const today = "2026-10-07";
  it("defaults to the last 28 days ending today", () => {
    expect(periodBounds(undefined, undefined, today, addDays)).toEqual({ from: "2026-09-09", to: "2026-10-07" });
  });

  it("uses what it is given and refuses bad, reversed or over-long periods", () => {
    expect(periodBounds("2026-10-01", "2026-10-05", today, addDays)).toEqual({ from: "2026-10-01", to: "2026-10-05" });
    expect(() => periodBounds("10/01/2026", undefined, today, addDays)).toThrow(SurveyRuleError);
    expect(() => periodBounds("2026-02-30x", undefined, today, addDays)).toThrow(SurveyRuleError);
    expect(() => periodBounds("2026-10-06", "2026-10-01", today, addDays)).toThrow(/must not be after/);
    expect(() => periodBounds("2024-01-01", "2026-10-01", today, addDays)).toThrow(/366/);
  });
});

describe("clampLimit", () => {
  it("keeps the comment limit between 1 and 100", () => {
    expect(clampLimit(undefined)).toBe(20);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(5000)).toBe(100);
    expect(clampLimit(12.9)).toBe(12);
    expect(clampLimit(NaN)).toBe(20);
  });
});
