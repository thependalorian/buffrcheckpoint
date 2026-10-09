import { assertFreshSession, isFreshSession } from "./step-up";

const now = Date.UTC(2026, 9, 8, 12, 0, 0);
const sec = now / 1000;

describe("step-up (DL-3)", () => {
  it("accepts a session that began within 15 minutes", () => {
    expect(isFreshSession({ issuedAt: sec - 60 }, now)).toBe(true);
    expect(isFreshSession({ issuedAt: sec - 900 }, now)).toBe(true);
  });

  it("refuses an older session and a token with no issue time", () => {
    expect(isFreshSession({ issuedAt: sec - 901 }, now)).toBe(false);
    expect(isFreshSession({}, now)).toBe(false);
  });

  it("throws a 403 with a stable code", () => {
    expect(() => assertFreshSession({ issuedAt: sec - 3600 }, now)).toThrow(/Sign in again/);
    try {
      assertFreshSession({}, now);
    } catch (error) {
      expect((error as { getResponse(): { code: string } }).getResponse().code).toBe("step_up_required");
    }
  });
});
