import { describe, expect, it } from "vitest";

import { deliverySummary } from "./invitations";

describe("invitation delivery summary", () => {
  it("says what was sent, or that nothing was", () => {
    expect(deliverySummary({ emailed: true, texted: false })).toBe("The link was emailed.");
    expect(deliverySummary({ emailed: true, texted: true })).toBe("The link was emailed. The link was texted.");
    expect(deliverySummary({ texted: true })).toBe("The link was texted.");
    expect(deliverySummary({})).toContain("Nothing was sent");
  });
});
