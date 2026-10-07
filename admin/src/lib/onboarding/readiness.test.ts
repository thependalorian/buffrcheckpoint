import { describe, expect, it } from "vitest";

import {
  addLaterSteps,
  autoSteps,
  deriveStatus,
  OWNER_STEPS,
  ownerProgress,
  type ReadinessStep,
  showReorganisedNote,
} from "./readiness";

const step = (
  code: ReadinessStep["code"],
  requirement: ReadinessStep["requirement"],
  extra: Partial<ReadinessStep> = {},
): ReadinessStep => ({
  code,
  requirement,
  state: "todo",
  missingEvidence: [],
  blockedBy: [],
  ...extra,
});

describe("deriveStatus", () => {
  it("maps every step to one of the four visible statuses", () => {
    expect(deriveStatus(step("site_hierarchy", "required", { state: "done" }))).toBe("complete");
    expect(deriveStatus(step("risk_identity_approval", "recommended", { state: "skipped" }))).toBe("not_needed");
    expect(deriveStatus(step("devices_mdm", "not_applicable"))).toBe("not_needed");
    expect(deriveStatus(step("cran_evidence", "conditional"))).toBe("not_needed");
    expect(deriveStatus(step("launch_route", "required", { blockedBy: ["sites.at_least_one"] }))).toBe("blocked");
    expect(deriveStatus(step("site_hierarchy", "required"))).toBe("ready");
  });
});

describe("the owner's three steps", () => {
  it("names them in order: try it, review the standards, go live", () => {
    expect([...OWNER_STEPS]).toEqual(["flow_tests", "notices_retention", "golive_approval"]);
  });

  it("counts honestly, only the required steps, never padded", () => {
    const steps = [
      step("organisation_profile", "auto", { state: "done" }),
      step("site_hierarchy", "auto"),
      step("notices_retention", "required", { state: "done" }),
      step("flow_tests", "required"),
      step("golive_approval", "required"),
      step("risk_identity_approval", "recommended", { state: "done" }),
    ];
    expect(ownerProgress(steps)).toEqual({ done: 1, total: 3 });
  });

  it("includes a kiosk's channels and device in the count when the route needs them", () => {
    const steps = [
      step("check_in_channels", "required"),
      step("devices_mdm", "required"),
      step("notices_retention", "required", { state: "done" }),
      step("flow_tests", "required", { state: "done" }),
      step("golive_approval", "required"),
    ];
    expect(ownerProgress(steps)).toEqual({ done: 2, total: 5 });
  });
});

describe("what was done for the owner, and what can wait", () => {
  const steps = [
    step("organisation_profile", "auto", { state: "done" }),
    step("check_in_channels", "auto"),
    step("flow_tests", "required"),
    step("risk_identity_approval", "recommended"),
    step("cran_evidence", "conditional"),
    step("devices_mdm", "not_applicable"),
  ];

  it("lists the automatic steps, including one that is not done so nothing is silently wrong", () => {
    expect(autoSteps(steps).map((item) => item.code)).toEqual(["organisation_profile", "check_in_channels"]);
  });

  it("puts optional, conditional and not-needed steps under add later, never the owner's own", () => {
    expect(addLaterSteps(steps).map((item) => item.code)).toEqual([
      "risk_identity_approval",
      "cran_evidence",
      "devices_mdm",
    ]);
  });

  it("treats an automatic step that is not done as ready, so it is shown with its fix", () => {
    expect(deriveStatus(step("check_in_channels", "auto"))).toBe("ready");
    expect(deriveStatus(step("check_in_channels", "auto", { state: "done" }))).toBe("complete");
  });
});

describe("showReorganisedNote", () => {
  it("shows for organisations that started before the reorganisation with earned completions", () => {
    const steps = [step("organisation_profile", "required", { state: "done" })];
    expect(showReorganisedNote({ startedAt: "2026-09-20T00:00:00Z", launchRoute: null, steps })).toBe(true);
    expect(showReorganisedNote({ startedAt: "2026-10-07T00:00:00Z", launchRoute: null, steps })).toBe(true);
    expect(showReorganisedNote({ startedAt: "2026-10-09T00:00:00Z", launchRoute: null, steps })).toBe(false);
    expect(showReorganisedNote({ startedAt: "2026-09-20T00:00:00Z", launchRoute: "qr_first", steps })).toBe(false);
  });
});
