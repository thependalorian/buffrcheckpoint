import { clampGrantDuration, GRANT_MAX_DURATION_MS } from "./support-sessions.service";

describe("break-glass grant duration (AZ-6)", () => {
  it("states the ceiling as eight hours", () => {
    expect(GRANT_MAX_DURATION_MS).toBe(8 * 60 * 60 * 1000);
  });

  it("uses the ceiling when no duration is requested", () => {
    expect(clampGrantDuration(undefined)).toBe(GRANT_MAX_DURATION_MS);
    expect(clampGrantDuration(Number.NaN)).toBe(GRANT_MAX_DURATION_MS);
  });

  it("never exceeds eight hours however much is asked for", () => {
    expect(clampGrantDuration(8 * 60 * 60 * 1000 + 1)).toBe(GRANT_MAX_DURATION_MS);
    expect(clampGrantDuration(30 * 24 * 60 * 60 * 1000)).toBe(GRANT_MAX_DURATION_MS);
    expect(clampGrantDuration(Number.MAX_SAFE_INTEGER)).toBe(GRANT_MAX_DURATION_MS);
  });

  it("keeps a shorter request and floors a zero or negative one at one minute", () => {
    expect(clampGrantDuration(30 * 60 * 1000)).toBe(30 * 60 * 1000);
    expect(clampGrantDuration(0)).toBe(60_000);
    expect(clampGrantDuration(-5)).toBe(60_000);
  });
});
