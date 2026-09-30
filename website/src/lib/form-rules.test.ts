import { describe, expect, it } from "vitest";

import { isFieldRequired, isFieldVisible, validateAnswerValue } from "./form-rules";

describe("form-rules", () => {
  it("hides fields until purpose equals vehicle", () => {
    const rule = {
      op: "and" as const,
      conditions: [{ fieldCode: "purpose_category", equals: "vehicle" }],
    };
    expect(isFieldVisible(rule, { purpose_category: "meeting" })).toBe(false);
    expect(isFieldVisible(rule, { purpose_category: "vehicle" })).toBe(true);
  });

  it("marks requiredIf when condition matches", () => {
    const schema = {
      requiredIf: { conditions: [{ fieldCode: "purpose_category", equals: "vehicle" }] },
    };
    expect(isFieldRequired(false, schema, { purpose_category: "vehicle" })).toBe(true);
    expect(isFieldRequired(false, schema, { purpose_category: "meeting" })).toBe(false);
  });

  it("rejects values outside options", () => {
    expect(validateAnswerValue("nope", { options: ["a", "b"] })).toMatch(/one of/i);
    expect(validateAnswerValue("a", { options: ["a", "b"] })).toBeNull();
  });
});
