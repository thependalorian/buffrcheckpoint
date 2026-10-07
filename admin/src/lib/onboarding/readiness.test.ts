import { describe, expect, it } from "vitest";

import {
  deriveStatus,
  groupByRequirement,
  nextBestAction,
  type ReadinessStep,
  showReorganisedNote,
  stepsToFirstCheckIn,
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

describe("groupByRequirement", () => {
  it("orders groups required, recommended, add later and drops empty ones", () => {
    const groups = groupByRequirement([
      step("risk_identity_approval", "recommended"),
      step("organisation_profile", "required"),
      step("cran_evidence", "conditional"),
      step("site_hierarchy", "required"),
    ]);
    expect(groups.map((group) => group.requirement)).toEqual(["required", "recommended", "conditional"]);
    expect(groups[0].steps.map((item) => item.code)).toEqual(["organisation_profile", "site_hierarchy"]);
  });
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

describe("stepsToFirstCheckIn", () => {
  it("counts only open required steps up to the site QR code", () => {
    const steps = [
      step("organisation_profile", "required", { state: "done" }),
      step("site_hierarchy", "required"),
      step("hosts_departments", "required"),
      step("check_in_channels", "required"),
      step("risk_identity_approval", "recommended"),
      step("flow_tests", "required"),
    ];
    expect(stepsToFirstCheckIn(steps)).toBe(3);
  });
});

describe("nextBestAction", () => {
  it("returns the current step when it can start", () => {
    const steps = [step("organisation_profile", "required", { state: "done" }), step("site_hierarchy", "required")];
    expect(nextBestAction({ currentStep: "site_hierarchy", steps })?.code).toBe("site_hierarchy");
  });

  it("skips past a blocked current step to its first unblocked required step", () => {
    const steps = [
      step("site_hierarchy", "required"),
      step("launch_route", "required", { blockedBy: ["sites.at_least_one"] }),
    ];
    expect(nextBestAction({ currentStep: "launch_route", steps })?.code).toBe("site_hierarchy");
  });
});

describe("showReorganisedNote", () => {
  it("shows for organisations that started before the reorganisation with earned completions", () => {
    const steps = [step("organisation_profile", "required", { state: "done" })];
    expect(showReorganisedNote({ startedAt: "2026-09-20T00:00:00Z", launchRoute: null, steps })).toBe(true);
    expect(showReorganisedNote({ startedAt: "2026-10-07T00:00:00Z", launchRoute: null, steps })).toBe(false);
    expect(showReorganisedNote({ startedAt: "2026-09-20T00:00:00Z", launchRoute: "qr_first", steps })).toBe(false);
  });
});
