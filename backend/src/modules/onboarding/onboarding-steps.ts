export const ONBOARDING_STEPS = [
  "organisation_profile",
  "branding",
  "site_hierarchy",
  "hosts_departments",
  "visitor_categories",
  "check_in_channels",
  "risk_identity_approval",
  "notices_retention",
  "devices_mdm",
  "cran_evidence",
  "flow_tests",
  "role_training",
  "golive_approval",
] as const;

export type OnboardingStepCode = (typeof ONBOARDING_STEPS)[number];

export const REQUIRED_BEFORE_GOLIVE: OnboardingStepCode[] = [
  "organisation_profile",
  "branding",
  "site_hierarchy",
  "hosts_departments",
  "visitor_categories",
  "check_in_channels",
  "risk_identity_approval",
  "notices_retention",
  "devices_mdm",
  "flow_tests",
  "role_training",
];
