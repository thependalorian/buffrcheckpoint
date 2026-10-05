import { BadRequestException, ConflictException } from "@nestjs/common";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { EvidenceSnapshot } from "./onboarding-evidence.service";
import { OnboardingPresenceService } from "./onboarding-presence.service";
import { OnboardingProgressService } from "./onboarding-progress.service";

const allFacts = new Proxy({} as EvidenceSnapshot, { get: () => true });
const user = { userId: "u1", organisationId: "o1" } as AuthenticatedUser;

function build(options: {
  completed?: string[];
  skipped?: string[];
  route?: string | null;
  commitResults?: boolean[];
  facts?: EvidenceSnapshot;
}) {
  const state = {
    id: "s1",
    organisationId: "o1",
    statusCode: "status-in_progress",
    launchRouteCode: options.route === undefined ? "route-qr_first" : options.route ? `route-${options.route}` : null,
    completedStepCodes: options.completed ?? [],
    skippedStepCodes: options.skipped ?? [],
    version: 3,
  };
  const results = [...(options.commitResults ?? [true])];
  const onboardingState = {
    getState: jest.fn(async () => state),
    statusOf: jest.fn(async () => "in_progress"),
    advanceIfEarlyStage: jest.fn(async () => undefined),
    assert: jest.fn(),
    commitProgress: jest.fn(async () => results.shift() ?? true),
  };
  const evidence = {
    snapshot: jest.fn(async () => options.facts ?? allFacts),
    assertSatisfied: jest.fn(async () => undefined),
    assertUnblocked: jest.fn(async () => undefined),
  };
  const typeDefs = {
    id: jest.fn(
      async (domain: string, code: string) =>
        `${domain === "onboarding_launch_route" ? "route" : domain === "organisation_onboarding_status" ? "status" : "step"}-${code}`,
    ),
    codeById: jest.fn(async (id: string) => id.replace(/^route-/, "")),
  };
  const auth = {
    getOnboardingStatus: jest.fn(async () => ({ ok: true })),
    resolveSubscriptionEntitlement: jest.fn(async () => ({ operationalUseAllowed: true })),
    billingContact: jest.fn(async () => null),
  };
  const db = {
    execute: jest.fn(async () => ({
      rows: [{ email: "maria@example.test", occurred_at: "2026-10-05T10:00:00.000Z" }],
    })),
  };
  const presence = new OnboardingPresenceService();
  const service = new OnboardingProgressService(
    db as never,
    onboardingState as never,
    evidence as never,
    typeDefs as never,
    auth as never,
    { send: jest.fn() } as never,
    presence,
  );
  return { service, onboardingState, evidence, presence };
}

describe("OnboardingProgressService", () => {
  it("treats completing an already completed step as a no-op", async () => {
    const { service, onboardingState } = build({ completed: ["organisation_profile"] });
    await service.completeStep(user, "organisation_profile");
    expect(onboardingState.commitProgress).not.toHaveBeenCalled();
  });

  it("records completion with the derived pointer and the expected version", async () => {
    const { service, onboardingState } = build({});
    await service.completeStep(user, "organisation_profile");
    expect(onboardingState.commitProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedVersion: 3,
        completed: ["organisation_profile"],
        currentStepId: "step-site_hierarchy",
      }),
    );
  });

  it("refuses devices on the QR-first route as not applicable", async () => {
    const { service } = build({});
    await expect(service.completeStep(user, "devices_mdm")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows skipping an optional step but not a required one", async () => {
    const { service, onboardingState } = build({});
    await service.skipStep(user, "branding");
    expect(onboardingState.commitProgress).toHaveBeenCalledWith(expect.objectContaining({ skipped: ["branding"] }));
    await expect(service.skipStep(user, "site_hierarchy")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("retries once on a version conflict, then returns 409", async () => {
    const retried = build({ commitResults: [false, true] });
    await retried.service.completeStep(user, "organisation_profile");
    expect(retried.onboardingState.commitProgress).toHaveBeenCalledTimes(2);

    const conflicted = build({ commitResults: [false, false] });
    await expect(conflicted.service.completeStep(user, "organisation_profile")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("names who last changed setup in the 409 body", async () => {
    const conflicted = build({ commitResults: [false, false] });
    await expect(conflicted.service.completeStep(user, "organisation_profile")).rejects.toMatchObject({
      response: { code: "ONBOARDING_CONFLICT", changedBy: "maria@example.test", changedAt: "2026-10-05T10:00:00.000Z" },
    });
  });

  it("checks prerequisites before choosing a launch route", async () => {
    const { service, evidence } = build({ route: null });
    evidence.assertUnblocked.mockRejectedValueOnce(new BadRequestException({ code: "ONBOARDING_STEP_BLOCKED" }));
    await expect(service.setLaunchRoute(user, "qr_first")).rejects.toBeInstanceOf(BadRequestException);
    expect(evidence.assertUnblocked).toHaveBeenCalledWith("o1", "u1", "launch_route");
  });

  it("reports blocked steps and other editors in readiness", async () => {
    const noSite = new Proxy({} as EvidenceSnapshot, { get: (_t, key) => key !== "site" && key !== "host" });
    const { service, presence } = build({ route: null, facts: noSite });
    presence.heartbeat("o1", { stepCode: "branding", userId: "u2", email: "maria@example.test" });
    const readiness = await service.readiness(user);
    const launchRoute = readiness.steps.find((step) => step.code === "launch_route");
    const flowTests = readiness.steps.find((step) => step.code === "flow_tests");
    expect(launchRoute?.blockedBy).toEqual(["sites.at_least_one"]);
    expect(flowTests?.blockedBy).toEqual(["sites.at_least_one", "hosts.at_least_one"]);
    expect(readiness.editing).toEqual([{ stepCode: "branding", email: "maria@example.test" }]);
  });

  it("moves to ready for go-live when the last required step is completed", async () => {
    const required = [
      "organisation_profile",
      "site_hierarchy",
      "hosts_departments",
      "launch_route",
      "notices_retention",
      "visitor_categories",
      "check_in_channels",
      "flow_tests",
    ];
    const { service, onboardingState } = build({ completed: required });
    await service.completeStep(user, "role_training");
    expect(onboardingState.commitProgress).toHaveBeenCalledWith(
      expect.objectContaining({ toStatusId: "status-ready_for_golive", currentStepId: "step-golive_approval" }),
    );
  });
});
