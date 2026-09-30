import { audienceDecision, deriveAudience } from "./session-audience";

describe("deriveAudience", () => {
  it("uses the aud claim when present", () => {
    expect(deriveAudience({ aud: "ops", roleCode: "owner_operator" })).toBe("ops");
    expect(deriveAudience({ aud: "admin", roleCode: "platform_support" })).toBe("admin");
    expect(deriveAudience({ aud: "ops_enroll", roleCode: "platform_support" })).toBe("ops_enroll");
  });

  it("classifies pre-aud tokens by role", () => {
    expect(deriveAudience({ roleCode: "platform_support" })).toBe("ops");
    expect(deriveAudience({ roleCode: "front_desk_operator" })).toBe("admin");
  });

  it("treats a support session as admin even for a platform user", () => {
    expect(deriveAudience({ roleCode: "platform_support", supportSessionId: "s1" })).toBe("admin");
  });

  it("ignores unknown aud values", () => {
    expect(deriveAudience({ aud: "root", roleCode: "owner_operator" })).toBe("admin");
  });
});

describe("audienceDecision", () => {
  it("lets ops sessions reach the ops surface", () => {
    for (const path of [
      "/platform/billing/catalog",
      "/platform/dashboard/organisations/x/sites?x=1",
      "/type-definitions/visit_status",
      "/capability-status",
      "/public/pricing",
      "/auth/me",
      "/auth/mfa/enroll/start",
    ]) {
      expect(audienceDecision("ops", path, undefined).allow).toBe(true);
    }
  });

  it("keeps ops sessions off customer routes", () => {
    for (const path of ["/sites", "/visits/123", "/hosts", "/auth/login", "/emergency/trigger"]) {
      expect(audienceDecision("ops", path, "visit.read.org").allow).toBe(false);
    }
  });

  it("limits the enrolment token to MFA enrolment and /auth/me", () => {
    expect(audienceDecision("ops_enroll", "/auth/mfa/enroll/start", undefined).allow).toBe(true);
    expect(audienceDecision("ops_enroll", "/auth/mfa/enroll/confirm", undefined).allow).toBe(true);
    expect(audienceDecision("ops_enroll", "/auth/me", undefined).allow).toBe(true);
    expect(audienceDecision("ops_enroll", "/platform/billing/catalog", "platform.billing.manage").allow).toBe(false);
  });

  it("refuses platform permissions to customer sessions", () => {
    expect(audienceDecision("admin", "/platform/billing/catalog", "platform.billing.manage").allow).toBe(false);
  });

  it("allows customer sessions on customer routes, including customer billing paths", () => {
    expect(audienceDecision("admin", "/sites", "site.manage").allow).toBe(true);
    expect(audienceDecision("admin", "/platform/billing/payments/pop", "visit.read.org").allow).toBe(true);
  });
});
