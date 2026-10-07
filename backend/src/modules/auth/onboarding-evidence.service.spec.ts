import { type EvidenceSnapshot, missingEvidence } from "./onboarding-evidence.service";

const none: EvidenceSnapshot = {
  legalName: false,
  site: false,
  host: false,
  launchRoute: false,
  privacyNoticePublished: false,
  retentionPolicy: false,
  formWithFields: false,
  siteQr: false,
  kioskConfig: false,
  accessPolicy: false,
  device: false,
  testVisit: false,
  trainingAcknowledged: false,
  evidencePack: false,
};

describe("missingEvidence", () => {
  it("needs only a site QR for check-in channels on the QR-first route", () => {
    expect(missingEvidence("check_in_channels", "qr_first", { ...none, siteQr: true })).toEqual([]);
  });

  it("also needs a kiosk configuration on the kiosk route", () => {
    expect(missingEvidence("check_in_channels", "kiosk", { ...none, siteQr: true })).toEqual([
      "kiosk_experience.config",
    ]);
  });

  it("requires both a published notice and a retention policy", () => {
    expect(missingEvidence("notices_retention", "qr_first", none)).toEqual([
      "privacy_policy.published_version",
      "retention_policy.at_least_one",
    ]);
  });

  it("requires a test visit and the user's training acknowledgement", () => {
    expect(missingEvidence("flow_tests", "kiosk", none)).toEqual(["visits.test_visit"]);
    expect(missingEvidence("role_training", "kiosk", none)).toEqual(["training.acknowledged"]);
  });

  it("has no evidence of its own for go-live", () => {
    expect(missingEvidence("golive_approval", "qr_first", none)).toEqual([]);
  });
});
