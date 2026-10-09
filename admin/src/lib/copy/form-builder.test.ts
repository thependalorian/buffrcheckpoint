import { describe, expect, it } from "vitest";

import { formBuilderCopy, needsPurposeNote, purposeNoteIsValid } from "./form-builder";

describe("form builder purpose note", () => {
  it("asks for a note only above the basic class", () => {
    expect(needsPurposeNote("core")).toBe(false);
    expect(needsPurposeNote("basic")).toBe(false);
    for (const code of ["sensitive", "high_risk", "verification_evidence"]) expect(needsPurposeNote(code)).toBe(true);
  });

  it("accepts a note of ten characters or more after trimming", () => {
    expect(purposeNoteIsValid(null)).toBe(false);
    expect(purposeNoteIsValid("   short   ")).toBe(false);
    expect(purposeNoteIsValid("Needed at the gate")).toBe(true);
  });

  it("keeps the copy free of em dashes and semicolons", () => {
    const text = Object.values(formBuilderCopy.purposeNote).join(" ");
    expect(text).not.toMatch(/[—;]/);
  });
});
