import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import type { HostsService } from "../hosts/hosts.service";
import type { OnboardingStateService } from "../onboarding-state/onboarding-state.service";
import type { EffectiveCheckInForm, VisitorPolicyService } from "../visitor-policy/visitor-policy.service";
import type { VisitsService } from "../visits/visits.service";
import { OnboardingTestVisitService, placeholderAnswers } from "./onboarding-test-visit.service";

jest.mock("../visits/visits.service", () => ({ VisitsService: class {} }));
jest.mock("../hosts/hosts.service", () => ({ HostsService: class {} }));
jest.mock("../visitor-policy/visitor-policy.service", () => ({ VisitorPolicyService: class {} }));

const user = {
  userId: "00000000-0000-0000-0000-0000000000aa",
  organisationId: "00000000-0000-0000-0000-0000000000bb",
  roleCode: "owner_operator",
} as unknown as AuthenticatedUser;

function field(fieldCode: string, required: boolean, validationSchema: Record<string, unknown> = {}) {
  return {
    fieldCode,
    fieldLabel: fieldCode,
    helpText: null,
    fieldTypeCode: "text",
    required,
    displayOrder: 1,
    dataClassificationCode: "basic",
    visibilityRule: {},
    validationSchema,
  };
}

describe("placeholderAnswers", () => {
  it("returns nothing when no form is published", () => {
    expect(placeholderAnswers(null)).toBeUndefined();
  });

  it("answers required fields only, honouring options and max length", () => {
    const form: EffectiveCheckInForm = {
      formDefinitionId: "f",
      formVersionId: "v1",
      formName: null,
      visitorTypeCode: "general",
      fields: [
        field("purpose", true, { options: ["meeting", "delivery"] }),
        field("ref", true, { maxLength: 4 }),
        field("notes", false),
      ],
    };
    const answers = placeholderAnswers(form) ?? [];
    expect(answers.map((a) => [a.fieldCode, a.answerValue.value])).toEqual([
      ["purpose", "meeting"],
      ["ref", "Onbo"],
    ]);
    expect(answers.every((a) => a.formVersionId === "v1")).toBe(true);
  });
});

describe("OnboardingTestVisitService", () => {
  /** First execute() is the existing-visit lookup, second the site/host lookup. */
  function build(existingRows: unknown[], hostRows: unknown[]) {
    const execute = jest.fn();
    execute.mockResolvedValueOnce({ rows: existingRows }).mockResolvedValueOnce({ rows: hostRows });
    const db = { execute } as unknown as Database;
    const visits = {
      checkIn: jest.fn(async (dto: { id: string }) => ({ id: dto.id })),
      checkOut: jest.fn(async () => ({})),
    };
    const policy = { resolveEffectiveForm: jest.fn(async () => null) };
    const state = { notifyChanged: jest.fn() };
    const hosts = { listBySite: jest.fn(async () => [{ id: "h1", displayName: "Reception host" }]) };
    const service = new OnboardingTestVisitService(
      db,
      visits as unknown as VisitsService,
      policy as unknown as VisitorPolicyService,
      state as unknown as OnboardingStateService,
      hosts as unknown as HostsService,
    );
    return { service, visits, state };
  }

  it("checks in through the normal path with the onboarding_test channel and leaves the visit open", async () => {
    const { service, visits, state } = build([], [{ host_id: "h1", site_id: "s1", site_name: "Main reception" }]);
    const result = await service.create("visit-1", user);
    expect(visits.checkIn).toHaveBeenCalledWith(
      expect.objectContaining({ id: "visit-1", siteId: "s1", hostId: "h1", captureChannelCode: "onboarding_test" }),
      user,
    );
    expect(visits.checkOut).not.toHaveBeenCalled();
    expect(state.notifyChanged).toHaveBeenCalledWith(user.organisationId);
    expect(result).toEqual({
      visitId: "visit-1",
      siteId: "s1",
      siteName: "Main reception",
      hostId: "h1",
      hostName: "Reception host",
      checkedIn: true,
    });
  });

  it("returns the existing visit for a retried client id instead of checking in twice", async () => {
    const { service, visits } = build(
      [{ id: "visit-1", site_id: "s1", site_name: "Main reception", host_id: "h1", checked_out_at: null }],
      [],
    );
    const result = await service.create("visit-1", user);
    expect(visits.checkIn).not.toHaveBeenCalled();
    expect(result).toMatchObject({ visitId: "visit-1", checkedIn: true });
  });

  it("refuses with a clear code when no active host exists", async () => {
    const { service, visits } = build([], []);
    await expect(service.create("visit-1", user)).rejects.toMatchObject({
      response: { code: "ONBOARDING_TEST_VISIT_NEEDS_HOST" },
    });
    expect(visits.checkIn).not.toHaveBeenCalled();
  });
});
