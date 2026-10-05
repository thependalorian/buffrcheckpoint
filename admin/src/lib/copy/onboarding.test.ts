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

  it("states the counts left to the first check-in in plain words", () => {
    expect(onboardingCopy.overview.stepsLeft(3)).toBe("You are 3 steps away from accepting your first QR check-in.");
    expect(onboardingCopy.overview.stepsLeft(1)).toBe("You are 1 step away from accepting your first QR check-in.");
  });
});
