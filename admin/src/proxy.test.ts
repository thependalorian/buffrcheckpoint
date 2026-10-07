import { describe, expect, it } from "vitest";

import type { SessionGate } from "@/lib/auth/session-gate";

import { gateRedirect } from "./proxy";

const base: SessionGate = {
  organisationName: "Org",
  emailVerified: true,
  mfaEnabled: true,
  onboardingComplete: false,
  canManageOnboarding: true,
  operationalUseAllowed: false,
  nextPath: "/onboarding/site-hierarchy",
};

describe("gateRedirect", () => {
  it("sends unverified users to check their email", () => {
    expect(gateRedirect({ ...base, emailVerified: false }, "/dashboard/sites")).toBe("/auth/check-email");
  });

  it("does not ask for MFA while the organisation is still being set up", () => {
    const setup = { ...base, mfaEnabled: false };
    expect(gateRedirect(setup, "/dashboard/sites")).toBeNull();
    expect(gateRedirect(setup, "/onboarding/site-hierarchy")).toBeNull();
    expect(gateRedirect(setup, "/auth/mfa/setup")).toBeNull();
  });

  it("requires MFA setup once onboarding is complete, and only lets the setup page through", () => {
    const live = { ...base, mfaEnabled: false, onboardingComplete: true, operationalUseAllowed: true };
    expect(gateRedirect(live, "/")).toBe("/auth/mfa/setup");
    expect(gateRedirect(live, "/dashboard/overview")).toBe("/auth/mfa/setup");
    expect(gateRedirect(live, "/dashboard/account")).toBe("/auth/mfa/setup");
    expect(gateRedirect(live, "/auth/mfa/setup")).toBeNull();
    expect(gateRedirect({ ...live, mfaEnabled: true }, "/dashboard/overview")).toBeNull();
  });

  it("keeps setup admins on configuration routes and away from operational ones", () => {
    expect(gateRedirect(base, "/dashboard/sites")).toBeNull();
    expect(gateRedirect(base, "/onboarding/site-hierarchy")).toBeNull();
    expect(gateRedirect(base, "/dashboard/front-desk")).toBeNull();
    expect(gateRedirect(base, "/dashboard/visitors")).toBe(base.nextPath);
    expect(gateRedirect(base, "/onboarding/waiting")).toBe(base.nextPath);
  });

  it("parks invited staff on the waiting page but leaves their own account reachable", () => {
    const staff = { ...base, canManageOnboarding: false, nextPath: "/onboarding/waiting" };
    expect(gateRedirect(staff, "/onboarding/site-hierarchy")).toBe("/onboarding/waiting");
    expect(gateRedirect(staff, "/dashboard/sites")).toBe("/onboarding/waiting");
    expect(gateRedirect(staff, "/dashboard/front-desk")).toBe("/onboarding/waiting");
    expect(gateRedirect(staff, "/dashboard/account")).toBeNull();
    expect(gateRedirect(staff, "/onboarding/waiting")).toBeNull();
    expect(gateRedirect(staff, "/")).toBe("/onboarding/waiting");
  });

  it("holds live organisations without a subscription on billing", () => {
    const live = { ...base, onboardingComplete: true };
    expect(gateRedirect(live, "/dashboard/front-desk")).toBe("/dashboard/billing");
    expect(gateRedirect(live, "/dashboard/billing")).toBeNull();
    expect(gateRedirect({ ...live, operationalUseAllowed: true }, "/")).toBe("/dashboard/overview");
    expect(gateRedirect({ ...live, operationalUseAllowed: true }, "/auth/login")).toBe("/dashboard/overview");
  });
});
