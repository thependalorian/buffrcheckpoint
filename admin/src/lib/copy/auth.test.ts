import { describe, expect, it } from "vitest";

import { PASSWORD_MIN_LENGTH, passwordRule } from "./auth";

describe("password rule copy", () => {
  it("states the same minimum the API enforces", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(passwordRule).toContain("12 characters");
  });
  it("asks for no composition rules", () => {
    expect(passwordRule.toLowerCase()).not.toMatch(/upper|digit|symbol|special/);
  });
});
