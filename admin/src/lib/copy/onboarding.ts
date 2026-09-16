export const onboardingCopy = {
  shellTitle: "Organisation onboarding",
  shellDescription: "Complete each required step before go-live. Progress is saved on the server.",
  markComplete: "Mark step complete",
  completing: "Saving...",
  openConfig: "Open configuration",
  openSecondary: "Open related",
  backToOnboarding: "Back to onboarding",
  goLiveBlocked: "Go-live stays blocked until required steps, email verification, and MFA are complete.",
  steps: {
    organisation_profile: {
      title: "Organisation profile",
      description: "Confirm your organisation legal name and trading name for this tenant.",
      href: "/dashboard/organisation",
    },
    branding: {
      title: "Branding",
      description: "Set visitor-facing brand colours and upload a logo for this organisation.",
      href: "/dashboard/site-experience/branding",
    },
    site_hierarchy: {
      title: "Region, site and zone",
      description: "Create at least one site that kiosks and hosts will attach to.",
      href: "/dashboard/sites",
    },
    hosts_departments: {
      title: "Hosts and departments",
      description: "Add reception hosts so visitors can select who they are visiting.",
      href: "/dashboard/hosts",
    },
    visitor_categories: {
      title: "Visitor categories",
      description: "Define the visitor types and check-in forms your sites will offer.",
      href: "/dashboard/policies/forms",
    },
    check_in_channels: {
      title: "Check-in channels",
      description: "Configure kiosk experience and public site QR codes for phone check-in.",
      href: "/dashboard/site-experience/kiosk",
      secondaryHref: "/dashboard/site-experience/qr",
      secondaryLabel: "Site QR codes",
    },
    risk_identity_approval: {
      title: "Risk, identity and approval",
      description: "Set risk tiers, identity assurance, and host approval rules.",
      href: "/dashboard/policies/access",
    },
    notices_retention: {
      title: "Notices, agreements and retention",
      description: "Confirm retention and deletion policy for visitor records.",
      href: "/dashboard/policies/retention",
    },
    devices_mdm: {
      title: "Devices and MDM",
      description: "Register kiosk devices and confirm MDM enrolment expectations.",
      href: "/dashboard/devices",
    },
    cran_evidence: {
      title: "CRAN device-compliance evidence",
      description: "Attach or review device-compliance evidence where required.",
      href: "/dashboard/devices/compliance",
    },
    flow_tests: {
      title: "Flow tests",
      description: "Walk through emergency roster visibility and visitor recovery paths.",
      href: "/dashboard/emergency",
    },
    role_training: {
      title: "Role training",
      description: "Review Owner-Operator and host role permissions for your organisation.",
      href: "/dashboard/roles",
    },
    golive_approval: {
      title: "Go-live approval",
      description: "Mark this step complete only after required evidence and MFA are in place. Dashboard opens after go-live.",
      href: "/onboarding/golive-approval",
    },
  },
} as const;

export type OnboardingStepSlug =
  | "organisation-profile"
  | "branding"
  | "site-hierarchy"
  | "hosts-departments"
  | "visitor-categories"
  | "check-in-channels"
  | "risk-identity-approval"
  | "notices-retention"
  | "devices-mdm"
  | "cran-evidence"
  | "flow-tests"
  | "role-training"
  | "golive-approval";

export const STEP_SLUG_TO_CODE: Record<OnboardingStepSlug, keyof typeof onboardingCopy.steps> = {
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

export const STEP_CODE_TO_SLUG = Object.fromEntries(
  Object.entries(STEP_SLUG_TO_CODE).map(([slug, code]) => [code, slug]),
) as Record<keyof typeof onboardingCopy.steps, OnboardingStepSlug>;
