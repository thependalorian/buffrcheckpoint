import { OnboardingPresenceService, PRESENCE_TTL_MS } from "./onboarding-presence.service";

describe("OnboardingPresenceService", () => {
  it("lists other live editors, never the caller, and expires stale entries", () => {
    const presence = new OnboardingPresenceService();
    presence.heartbeat("o1", { stepCode: "check_in_channels", userId: "u1", email: "a@example.test" }, 0);
    presence.heartbeat("o1", { stepCode: "site_hierarchy", userId: "u2", email: "b@example.test" }, 0);

    expect(presence.others("o1", "u1", 1).map((entry) => entry.email)).toEqual(["b@example.test"]);
    expect(presence.others("o2", "u1", 1)).toEqual([]);
    expect(presence.others("o1", "u3", PRESENCE_TTL_MS + 1)).toEqual([]);
  });
});
