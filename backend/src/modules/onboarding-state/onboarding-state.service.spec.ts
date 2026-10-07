import { BadRequestException, ConflictException } from "@nestjs/common";

import { sessionCache } from "../../common/auth/session-cache";
import type { Database } from "../../db/client";
import type { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { type OnboardingStateRow, OnboardingStateService } from "./onboarding-state.service";

const STATUS_IDS: Record<string, string> = {
  pending_email_verification: "s-pending",
  email_verified: "s-email",
  mfa_enrolled: "s-mfa",
  in_progress: "s-progress",
  ready_for_golive: "s-ready",
  live: "s-live",
  suspended: "s-suspended",
};

function harness(initialStatus: string | null) {
  const batches: unknown[][] = [];
  const state: OnboardingStateRow | undefined = initialStatus
    ? ({
        id: "state-1",
        organisationId: "org-1",
        statusCode: STATUS_IDS[initialStatus],
        currentStepCode: null,
        completedStepCodes: [],
        goliveApprovedAt: null,
        goliveApprovedBy: null,
        createdAt: new Date(),
        deletedAt: null,
      } as unknown as OnboardingStateRow)
    : undefined;

  const chain = { values: () => chain, set: () => chain, where: () => chain };
  const db = {
    query: {
      organisationOnboardingStates: { findFirst: jest.fn(async () => state) },
      organisations: { findFirst: jest.fn(async () => ({ id: "org-1" })) },
    },
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    batch: jest.fn(async (ops: unknown[]) => {
      batches.push(ops);
      return [];
    }),
  } as unknown as Database;

  const typeDefs = {
    id: jest.fn(async (domain: string, code: string) =>
      domain === "organisation_onboarding_status" ? STATUS_IDS[code] : `${domain}:${code}`,
    ),
    codeById: jest.fn(async (id: string) => Object.entries(STATUS_IDS).find(([, v]) => v === id)?.[0] ?? null),
  } as unknown as TypeDefinitionLookupService;

  const service = new OnboardingStateService(db, typeDefs);
  const changes: string[] = [];
  jest.spyOn(sessionCache, "invalidateOrganisation").mockImplementation((orgId) => {
    changes.push(orgId);
  });
  return { service, batches, changes, db };
}

describe("OnboardingStateService", () => {
  afterEach(() => jest.restoreAllMocks());

  it("leaves a live organisation untouched when an invited user verifies email and enrols MFA", async () => {
    const { service, batches, changes } = harness("live");
    await service.advanceIfEarlyStage("org-1", "email_verified", "invitee");
    await service.advanceIfEarlyStage("org-1", "in_progress", "invitee");
    expect(batches).toHaveLength(0);
    expect(changes).toHaveLength(0);
  });

  it("walks a new organisation forward one logged step at a time", async () => {
    const { service, batches, changes } = harness("email_verified");
    await service.advanceIfEarlyStage("org-1", "in_progress", "owner");
    // email_verified -> in_progress: one state update with its log row (the mfa_enrolled stage is retired, D-20).
    expect(batches).toHaveLength(1);
    for (const ops of batches) expect(ops).toHaveLength(2);
    expect(changes).toEqual(["org-1"]);
  });

  it("refuses a forward transition that skips the map", async () => {
    const { service } = harness("live");
    await expect(service.transition("org-1", "in_progress", "someone")).rejects.toBeInstanceOf(ConflictException);
  });

  it("requires a reason to reopen setup and refuses when setup is already open", async () => {
    await expect(harness("live").service.reopenSetup("org-1", "ops", "  ")).rejects.toBeInstanceOf(BadRequestException);
    await expect(harness("in_progress").service.reopenSetup("org-1", "ops", "customer asked")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("reopens a live organisation with one batched update plus log row", async () => {
    const { service, batches } = harness("live");
    const result = await service.reopenSetup("org-1", "ops", "subscription lapsed, re-verify");
    expect(result).toEqual({ organisationId: "org-1", fromStatus: "live", toStatus: "in_progress" });
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
  });

  it("rejects unknown statuses and overrides back to pending_email_verification", async () => {
    const { service } = harness("live");
    await expect(service.setStatus("org-1", "bogus", "ops", "valid reason")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.setStatus("org-1", "pending_email_verification", "ops", "valid reason"),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
