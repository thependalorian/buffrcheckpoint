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
  status?: string;
  legalPending?: string[];
  kybStatus?: string;
}) {
  const state = {
    id: "s1",
    organisationId: "o1",
    statusCode: `status-${options.status ?? "in_progress"}`,
    launchRouteCode: options.route === undefined ? "route-qr_first" : options.route ? `route-${options.route}` : null,
    completedStepCodes: options.completed ?? [],
    skippedStepCodes: options.skipped ?? [],
    version: 3,
  };
  const results = [...(options.commitResults ?? [true])];
  // The fake store applies a successful write to its state, as the real one does, so a later read in the same flow sees it.
  const onboardingState = {
    getState: jest.fn(async () => state),
    statusOf: jest.fn(async () => state.statusCode.replace(/^status-/, "")),
    advanceIfEarlyStage: jest.fn(async () => undefined),
    assert: jest.fn(),
    commitProgress: jest.fn(
      async (write: { completed: string[]; skipped: string[]; toStatusId: string; launchRouteId: string | null }) => {
        const applied = results.shift() ?? true;
        if (applied) {
          state.completedStepCodes = write.completed;
          state.skippedStepCodes = write.skipped;
          state.statusCode = write.toStatusId;
          if (write.launchRouteId) state.launchRouteCode = write.launchRouteId;
          state.version += 1;
        }
        return applied;
      },
    ),
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
      rows: [
        {
          email: "maria@example.test",
          occurred_at: "2026-10-05T10:00:00.000Z",
          ...(options.kybStatus ? { status_code: options.kybStatus, submitted_at: "2026-10-06T08:00:00.000Z" } : {}),
        },
      ],
    })),
  };
  const standards = {
    accept: jest.fn(async () => ({ accepted: true })),
    summary: jest.fn(async () => ({ ready: true })),
  };
  const legal = {
    status: jest.fn(async () => ({ documents: [], pending: options.legalPending ?? [] })),
    isCurrent: jest.fn(async () => (options.legalPending ?? []).length === 0),
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
    standards as never,
    legal as never,
  );
  return { service, onboardingState, evidence, presence, standards, legal };
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
        // The owner's next job is the standards review: the system's own steps never take the pointer.
        currentStepId: "step-notices_retention",
      }),
    );
  });

  it("refuses devices on the QR-first route as not applicable", async () => {
    const { service } = build({});
    await expect(service.completeStep(user, "devices_mdm")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows skipping an optional step but not a required one", async () => {
    const { service, onboardingState } = build({});
    await service.skipStep(user, "risk_identity_approval");
    expect(onboardingState.commitProgress).toHaveBeenCalledWith(
      expect.objectContaining({ skipped: ["risk_identity_approval"] }),
    );
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
    presence.heartbeat("o1", { stepCode: "check_in_channels", userId: "u2", email: "maria@example.test" });
    const readiness = await service.readiness(user);
    const launchRoute = readiness.steps.find((step) => step.code === "launch_route");
    const flowTests = readiness.steps.find((step) => step.code === "flow_tests");
    expect(launchRoute?.blockedBy).toEqual(["sites.at_least_one"]);
    expect(flowTests?.blockedBy).toEqual(["sites.at_least_one", "hosts.at_least_one"]);
    expect(readiness.editing).toEqual([{ stepCode: "check_in_channels", email: "maria@example.test" }]);
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

  describe("automatic steps", () => {
    const AUTO = [
      "organisation_profile",
      "site_hierarchy",
      "hosts_departments",
      "launch_route",
      "visitor_categories",
      "check_in_channels",
      "role_training",
    ];

    it("completes every automatic step whose evidence exists, and applies the default route, in one write", async () => {
      const { service, onboardingState } = build({ route: null });
      await service.syncAutoSteps(user);
      expect(onboardingState.commitProgress).toHaveBeenCalledTimes(1);
      const written = (
        onboardingState.commitProgress.mock.calls[0] as unknown as [{ completed: string[]; launchRouteId: string }]
      )[0];
      expect([...written.completed].sort()).toEqual([...AUTO].sort());
      expect(written.launchRouteId).toBe("route-qr_first");
      // Entering setup moves an organisation out of its activation stage.
      expect(onboardingState.advanceIfEarlyStage).toHaveBeenCalled();
    });

    it("does not complete a step whose evidence is missing", async () => {
      const noQr = new Proxy({} as EvidenceSnapshot, { get: (_t, key) => key !== "siteQr" });
      const { service, onboardingState } = build({ route: "qr_first", facts: noQr });
      await service.syncAutoSteps(user);
      const written = (onboardingState.commitProgress.mock.calls[0] as unknown as [{ completed: string[] }])[0];
      expect(written.completed).not.toContain("check_in_channels");
      expect(written.completed).toContain("site_hierarchy");
    });

    it("writes nothing when everything is already complete", async () => {
      const { service, onboardingState } = build({ route: "qr_first", completed: AUTO });
      await service.syncAutoSteps(user);
      expect(onboardingState.commitProgress).not.toHaveBeenCalled();
      expect(onboardingState.advanceIfEarlyStage).not.toHaveBeenCalled();
    });

    it("leaves setup alone once it is closed", async () => {
      for (const status of ["ready_for_golive", "live", "suspended"]) {
        const { service, onboardingState } = build({ route: "qr_first", status });
        await service.syncAutoSteps(user);
        expect(onboardingState.commitProgress).not.toHaveBeenCalled();
      }
    });

    it("never touches the default route when the owner chose a kiosk", async () => {
      const { service, onboardingState } = build({ route: "kiosk" });
      await service.syncAutoSteps(user);
      const written = (onboardingState.commitProgress.mock.calls[0] as unknown as [{ launchRouteId: string }])[0];
      expect(written.launchRouteId).toBe("route-kiosk");
    });

    it("is run by readiness, so the owner never sees a finished step as a to-do", async () => {
      const { service, onboardingState } = build({ route: null });
      await service.readiness(user);
      expect(onboardingState.commitProgress).toHaveBeenCalled();
    });
  });

  describe("standards", () => {
    it("records the acceptance first and then completes the review step", async () => {
      const { service, standards, onboardingState } = build({ route: "qr_first", completed: ["site_hierarchy"] });
      await service.acceptStandards(user);
      expect(standards.accept).toHaveBeenCalledWith(user);
      expect(onboardingState.commitProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stepCode: "notices_retention",
          completed: expect.arrayContaining(["notices_retention"]),
        }),
      );
    });

    it("does not complete the step when the acceptance cannot be recorded", async () => {
      const { service, standards, onboardingState } = build({ route: "qr_first" });
      standards.accept.mockRejectedValueOnce(new BadRequestException("not ready"));
      await expect(service.acceptStandards(user)).rejects.toBeInstanceOf(BadRequestException);
      expect(onboardingState.commitProgress).not.toHaveBeenCalled();
    });
  });

  describe("go-live", () => {
    const ready = [
      "organisation_profile",
      "site_hierarchy",
      "hosts_departments",
      "launch_route",
      "notices_retention",
      "visitor_categories",
      "check_in_channels",
      "flow_tests",
      "role_training",
    ];

    it("goes live when every step is done and the agreements are current", async () => {
      const { service, onboardingState } = build({ completed: ready });
      await service.completeStep(user, "golive_approval");
      expect(onboardingState.commitProgress).toHaveBeenCalledWith(
        expect.objectContaining({ toStatusId: "status-live" }),
      );
    });

    it("refuses go-live while an agreement is pending, naming it", async () => {
      const { service, onboardingState } = build({ completed: ready, legalPending: ["terms"] });
      await expect(service.completeStep(user, "golive_approval")).rejects.toMatchObject({
        response: { code: "ONBOARDING_EVIDENCE_MISSING", missingEvidence: ["legal.current_versions"] },
      });
      expect(onboardingState.commitProgress).not.toHaveBeenCalled();
    });

    it("completes the system's own steps first, so an acknowledgement given a moment ago counts", async () => {
      const { service, onboardingState } = build({ completed: ready.filter((s) => s !== "role_training") });
      await service.completeStep(user, "golive_approval");
      // One write for the automatic step, one for go-live itself.
      expect(onboardingState.commitProgress).toHaveBeenCalledTimes(2);
    });
  });

  describe("the go-live block in readiness", () => {
    it("shows plan, business verification, agreements and the owner's own steps before the last step", async () => {
      const { service } = build({ route: "qr_first", kybStatus: "pending", legalPending: ["privacy"] });
      const { goLive } = await service.readiness(user);
      expect(goLive).toMatchObject({
        subscription: { operationalUseAllowed: true },
        kyb: { status: "pending", submittedAt: "2026-10-06T08:00:00.000Z" },
        legalPending: ["privacy"],
        standardsAccepted: true,
        testArrivalDone: true,
        launchAcknowledged: true,
      });
    });

    it("reports business verification as none before anything is submitted", async () => {
      const { service } = build({ route: "qr_first" });
      expect((await service.readiness(user)).goLive.kyb).toEqual({ status: "none", submittedAt: null });
    });
  });

  describe("changing the launch route", () => {
    it("drops a completion that no longer holds under the new route, so go-live cannot pass on stale evidence", async () => {
      // QR-first needed only a site QR; a kiosk also needs a kiosk configuration, which this organisation does not have.
      const noKiosk = new Proxy({} as EvidenceSnapshot, { get: (_t, key) => key !== "kioskConfig" });
      const { service, onboardingState } = build({
        route: "qr_first",
        completed: ["site_hierarchy", "check_in_channels", "notices_retention"],
        facts: noKiosk,
      });
      await service.setLaunchRoute(user, "kiosk");
      const written = (onboardingState.commitProgress.mock.calls[0] as unknown as [{ completed: string[] }])[0];
      expect(written.completed).not.toContain("check_in_channels");
      expect(written.completed).toEqual(
        expect.arrayContaining(["site_hierarchy", "notices_retention", "launch_route"]),
      );
    });

    it("keeps every completion that still holds", async () => {
      const { service, onboardingState } = build({
        route: "qr_first",
        completed: ["site_hierarchy", "check_in_channels"],
      });
      await service.setLaunchRoute(user, "kiosk");
      const written = (onboardingState.commitProgress.mock.calls[0] as unknown as [{ completed: string[] }])[0];
      expect(written.completed).toEqual(expect.arrayContaining(["site_hierarchy", "check_in_channels"]));
    });
  });
});
