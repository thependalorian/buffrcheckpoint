import { describe, expect, it } from "vitest";

import { POLICY_SUBPROCESSORS, PRIVACY_COPY } from "./privacy";

describe("privacy policy facts", () => {
  it("lists the providers that can receive visitor data, with a region for each", () => {
    const withData = POLICY_SUBPROCESSORS.filter((s) => s.visitorPersonalData).map((s) => s.name);
    expect(withData).toEqual(expect.arrayContaining(["Neon", "Railway"]));
    for (const s of POLICY_SUBPROCESSORS) expect(s.region.length).toBeGreaterThan(0);
  });

  it("does not claim Namibian hosting or an EU analytics region", () => {
    const all = JSON.stringify([POLICY_SUBPROCESSORS, PRIVACY_COPY]).replace("We do not claim that data is hosted in Namibia", "");
    expect(all).not.toMatch(/hosted in Namibia/i);
    expect(all).not.toMatch(/stored in Namibia/i);
    expect(PRIVACY_COPY.transfer).toContain("We do not claim that data is hosted in Namibia");
    expect(PRIVACY_COPY.cookiesAnalytics).not.toContain("EU");
  });
});
