import { describe, expect, it } from "vitest";

import { blockerText, onboardingCopy } from "./onboarding";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
// Evidence keys (sites.at_least_one), step codes (site_hierarchy) and schema terms are server contracts, not UI copy.
const INTERNAL =
  /\b[a-z]+_[a-z_]+\b|\b[a-z_]+\.[a-z_]+\b|\b(?:uuid|evidence key|version conflict|optimistic concurrency)\b/i;

/** Every customer-visible string in the module: plain strings plus copy functions called with sample values. */
function renderedStrings(value: unknown, key = ""): string[] {
  if (key === "href" || key === "secondaryHref") return [];
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String((value as (...args: unknown[]) => unknown)("Sample", "sample step"))];
  if (Array.isArray(value)) return value.flatMap((item) => renderedStrings(item));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([childKey, child]) =>
      // blockerCopy is keyed by evidence keys; only its values are rendered.
      renderedStrings(child, childKey),
    );
  }
  return [];
}

describe("onboarding copy (§11.9.15.4)", () => {
  const strings = renderedStrings(onboardingCopy);

  it("collects the rendered copy and the detector catches real leaks", () => {
    expect(strings.length).toBeGreaterThan(100);
    for (const leak of [
      "sites.at_least_one",
      "site_hierarchy",
      "Version conflict",
      "4f0c3a2e-1b2c-4d5e-8f90-123456789abc",
    ]) {
      expect(UUID.test(leak) || INTERNAL.test(leak)).toBe(true);
    }
  });

  it("never shows a UUID, evidence key, step code or schema term", () => {
    const leaks = strings.filter((text) => UUID.test(text) || INTERNAL.test(text));
    expect(leaks).toEqual([]);
  });

  it("translates every blocker key, including go-live step blockers", () => {
    for (const key of Object.keys(onboardingCopy.blockerCopy)) {
      expect(INTERNAL.test(blockerText(key))).toBe(false);
    }
    expect(blockerText("step.site_hierarchy")).toBe("Complete: First site");
  });

  it("states the owner's progress in plain words", () => {
    expect(onboardingCopy.home.progress(1, 3)).toBe("1 of 3 done");
    expect(onboardingCopy.home.standards.days(365)).toBe("365 days");
    expect(onboardingCopy.home.standards.days(1)).toBe("1 day");
  });

  it("says Checkpoint does the privacy work, makes no compliance claim, and does not hand the work back", () => {
    const text = onboardingCopy.home.standards.responsibility;
    expect(text).toMatch(/for you/);
    expect(text.toLowerCase()).not.toMatch(/responsible for its own|your own legal|remains? responsible/);
    expect(strings.join(" ").toLowerCase()).not.toMatch(/\bcompliant\b|\bcertified\b|guarantee/);
  });

  it("uses no em dash and no emoji anywhere in the setup copy", () => {
    expect(strings.filter((text) => /\u2014|\p{Extended_Pictographic}/u.test(text))).toEqual([]);
  });

  it("tells the owner about two-step sign-in before they go live, not after", () => {
    expect(onboardingCopy.home.goLive.afterGoLive).toMatch(/two-step sign-in/);
    expect(onboardingCopy.home.goLive.afterGoLive).toMatch(/required once your organisation is live/);
  });

  it("says who reviews business verification and when it is needed", () => {
    expect(onboardingCopy.home.goLive.kyb.why).toMatch(/paid plan/);
    expect(onboardingCopy.home.goLive.kyb.why).toMatch(/reviews them by hand/);
  });

  it("explains the two new blockers", () => {
    expect(blockerText("standards.accepted")).toMatch(/Accept your standards/);
    expect(blockerText("legal.current_versions")).toMatch(/Terms and Privacy Policy/);
  });
});
