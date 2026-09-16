import assert from "node:assert/strict";

const STEP_SLUG_TO_CODE = {
  "organisation-profile": "organisation_profile",
  branding: "branding",
  "site-hierarchy": "site_hierarchy",
  "hosts-departments": "hosts_departments",
  "visitor-categories": "visitor_categories",
  "check-in-channels": "check_in_channels",
  "risk-identity-approval": "risk_identity_approval",
  "notices-retention": "notices_retention",
  "devices-mdm": "devices_mdm",
  "cran-evidence": "cran_evidence",
  "flow-tests": "flow_tests",
  "role-training": "role_training",
  "golive-approval": "golive_approval",
};

assert.equal(Object.keys(STEP_SLUG_TO_CODE).length, 13);
assert.equal(new Set(Object.values(STEP_SLUG_TO_CODE)).size, 13);
console.log("onboarding copy/slug checks passed");
