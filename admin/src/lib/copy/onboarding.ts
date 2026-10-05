/** "You are N steps away..." with the right plural, for the readiness header. */
function stepsAway(count: number, what: string): string {
  if (count === 0) return `You are ready to accept your first ${what}.`;
  const steps = count === 1 ? "1 step" : `${count} steps`;
  return `You are ${steps} away from accepting your first ${what}.`;
}

export const onboardingCopy = {
  shellTitle: "Launch readiness",
  shellDescription:
    "Finish the required items to go live. Recommended items improve the visitor experience and can be done now or later.",
  markComplete: "Save and return to launch readiness",
  completing: "Saving...",
  skip: "Do this later",
  skipping: "Saving...",
  openConfig: "Open setup page",
  openSecondary: "Open related",
  backToOnboarding: "Back to launch readiness",
  goLiveBlocked: "Go-live stays blocked until every required item, email verification, and MFA are complete.",
  conflict: {
    withActor: (who: string) => `Setup changed by ${who} a moment ago.`,
    withoutActor: "Setup changed a moment ago.",
    refreshed: "We refreshed this page with the latest launch readiness.",
    review: "Review latest status",
  },
  editing: (who: string, step: string) => `${who} is currently editing ${step}. Try again in a moment.`,
  genericError: "Could not save this step. Try again.",
  evidenceActions: {
    role_training: {
      label: "I understand the visitor flow",
      pending: "Recording acknowledgement...",
      done: "Acknowledgement recorded.",
    },
  },
  stillNeeded: "Still needed",
  banner: {
    message: "Launch readiness is still in progress. Set up this page, then return to launch readiness.",
  },
  overview: {
    greeting: (organisationName: string) => `Welcome to Buffr Checkpoint, ${organisationName}`,
    stepsLeft: (count: number) => stepsAway(count, "QR check-in"),
    stepsLeftKiosk: (count: number) => stepsAway(count, "visitor check-in"),
    nextUp: "Next best step",
    allRequiredDone: "Every required item is done. Approve go-live when you are ready.",
    reorganised: "We reorganised setup. Everything you already finished is still done.",
    route: {
      label: "Your launch route",
      notChosen: "Not chosen yet. QR-first is the default: no tablet needed.",
      change: "Change route",
      choose: "Choose route",
      summary: {
        qr_first: "Visitors check in on their phone. Your team can assist anyone without a phone.",
        kiosk: "Visitors check in on a tablet at reception. Your team can assist anyone who needs help.",
      },
    },
    sections: {
      required: "Required for launch",
      recommended: "Recommended",
      conditional: "Add later",
      not_applicable: "Not needed for your launch route",
    },
    status: {
      ready: "Start",
      blocked: "Blocked",
      complete: "Review",
      not_needed: "Not needed",
      skipped: "Set up anytime",
    },
    statusLabel: {
      ready: "Ready to start",
      blocked: "Blocked",
      complete: "Complete",
      not_needed: "Not needed now",
    },
    needsFirst: "Needs first:",
  },
  template: {
    whatYouNeed: "What you will need",
    doneMeans: 'What "done" means',
    blockedTitle: (stepTitle: string) => `You cannot start ${stepTitle.toLowerCase()} yet`,
    alreadyDone: "This is done. You can review or change it at any time.",
    skipped: "You chose to do this later. You can set it up at any time.",
    notNeededTitle: "Not needed for your launch route",
  },
  launchRoute: {
    title: "How do you want visitors to check in first?",
    description: "This decides what must be ready before launch. It does not limit what you can add later.",
    recommended: "Recommended",
    current: "Current route",
    saving: "Saving...",
    changeLater: "You can change this later. Your visitor records, policies, and staff setup remain the same.",
    lockedAfterSetup:
      "The launch route is fixed once setup is complete. Ask Buffr support to reopen setup to change it.",
    options: {
      qr_first: {
        title: "QR-first",
        description: "Use a printed QR code. Visitors check in on their own phone.",
        points: [
          "No tablet required",
          "Includes assisted front-desk check-in",
          "Fastest route to launch",
          "Best for most first sites",
        ],
        choose: "Choose QR-first",
      },
      kiosk: {
        title: "Dedicated kiosk",
        description: "Use an Android tablet at reception.",
        points: [
          "Branded visitor welcome screen",
          "Offline capture",
          "Optional NFC fast lane",
          "Requires device setup and governance",
        ],
        choose: "Choose kiosk",
      },
    },
  },
  testVisit: {
    title: "Test your visitor flow",
    intro: "We will create a safe test visitor at:",
    noTarget: "Add a site and an active host first. The test visitor needs somewhere to arrive and someone to visit.",
    create: "Create test visit",
    creating: "Creating test visit...",
    createdTitle: "Test visit created.",
    facts: [
      "It appears in your Front Desk roster",
      "It is excluded from analytics and billing",
      "You can safely check it out after reviewing it",
    ],
    view: "View test visit",
    checkOut: "Check out test visitor",
    checkingOut: "Checking out...",
    checkedOut: "Test visitor checked out. Your visitor flow works.",
    another: "Create another test visit",
    failed: "Could not create the test visit. Try again.",
    checkOutFailed: "Could not check out the test visitor. Try again from the Front Desk.",
  },
  sitePicker: {
    label: "Site",
    orgDefault: "Organisation default (all sites)",
    placeholder: "Select a site",
    noSites: "Create a site first",
    createSite: "Create a site",
  },
  waiting: {
    title: "Your organisation is being set up",
    notReady: (organisationName: string) => `${organisationName} is not ready for staff access yet.`,
    owner: "Your Owner-Operator is completing site and visitor-flow setup.",
    nextTitle: "What happens next:",
    next: [
      "Your organisation completes setup",
      "You receive access automatically",
      "You can then use the tools assigned to your role",
    ],
    checkStatus: "Check status",
    checking: "Checking...",
    signOut: "Sign out",
    help: "Need help? Contact your organisation owner.",
  },
  steps: {
    organisation_profile: {
      title: "Organisation profile",
      description: "Your legal and trading name appear on visitor notices and records.",
      time: "About 1 minute",
      whatYouNeed: ["Your organisation's legal name", "Your trading name, if different"],
      doneMeans: "Your organisation has a legal name on record.",
      href: "/dashboard/organisation",
    },
    site_hierarchy: {
      title: "First site",
      description: "Needed to generate your visitor QR code. Hosts, QR codes and kiosks all belong to a site.",
      time: "About 2 minutes",
      whatYouNeed: ["The site name and address", "A reception contact"],
      doneMeans: "A site exists and is available for visitor setup.",
      href: "/dashboard/sites",
    },
    hosts_departments: {
      title: "Hosts and departments",
      description: "Visitors choose who they are visiting, and that person is notified when they arrive.",
      time: "About 2 minutes",
      whatYouNeed: ["The name of at least one person visitors come to see", "Their email, to notify them"],
      doneMeans: "At least one host can receive visitors at your site.",
      href: "/dashboard/hosts",
    },
    launch_route: {
      title: "Launch route",
      description: "Decide how visitors check in first. It sets what must be ready before launch.",
      time: "About 1 minute",
      whatYouNeed: ["A decision: phone QR code or a reception tablet"],
      doneMeans: "Your launch route is chosen. You can change it later.",
      href: "/onboarding/launch-route",
    },
    notices_retention: {
      title: "Privacy notice and retention",
      description:
        "Visitors see your privacy notice before they share details, and records are kept only as long as you decide.",
      time: "About 5 minutes",
      whatYouNeed: ["Your visitor privacy notice text", "How long to keep visitor records"],
      doneMeans: "A privacy notice is published and a retention policy exists.",
      href: "/dashboard/policies/retention",
    },
    visitor_categories: {
      title: "Check-in form",
      description: "The form asks visitors only what your site needs, nothing more.",
      time: "About 3 minutes",
      whatYouNeed: ["The details you need from each visitor"],
      doneMeans: "A check-in form has at least one field.",
      href: "/dashboard/policies/forms",
    },
    check_in_channels: {
      title: "Site QR code",
      description: "Print the QR code for reception. Visitors scan it to check in on their phone.",
      time: "About 2 minutes",
      whatYouNeed: ["Your first site", "A printer, or a screen at reception"],
      doneMeans: "Your site has an active QR code. On the kiosk route, the kiosk experience is also set up.",
      href: "/dashboard/site-experience/qr",
      secondaryHref: "/dashboard/site-experience/kiosk",
      secondaryLabel: "Kiosk experience",
    },
    branding: {
      title: "Brand the experience",
      description:
        "Add your logo, welcome message, and help contact. You can start with the defaults and personalise later.",
      time: "About 3 minutes",
      whatYouNeed: ["Your logo as PNG, JPG, or WebP, up to 400 KB", "A brand colour", "A help contact for visitors"],
      doneMeans: "Your branding is published and visitors see it on check-in.",
      requirementNote: {
        qr_first: "Recommended, not required for launch",
        kiosk: "Required before kiosk launch",
      },
      href: "/dashboard/site-experience/branding",
    },
    risk_identity_approval: {
      title: "Add an access policy",
      description: "Decide which visits need host approval and what identity checks apply.",
      time: "About 3 minutes",
      whatYouNeed: ["Which areas or visitor types need approval"],
      doneMeans: "At least one access policy exists.",
      href: "/dashboard/policies/access",
    },
    devices_mdm: {
      title: "Kiosk device and MDM",
      description: "Register the reception tablet so it can be managed and secured.",
      time: "About 5 minutes",
      whatYouNeed: ["The tablet serial number", "Your device management details"],
      doneMeans: "At least one kiosk device is registered.",
      notNeeded:
        "Not needed for your QR-first launch. Choose the kiosk route later if your site needs a dedicated visitor tablet.",
      href: "/dashboard/devices",
    },
    flow_tests: {
      title: "Test your first arrival",
      description: "Proves a visitor can check in safely before you go live.",
      time: "About 1 minute",
      whatYouNeed: ["A site with an active host"],
      doneMeans: "A test visit appears on your Front Desk roster.",
      href: "/onboarding/flow-tests",
    },
    role_training: {
      title: "Owner-Operator launch acknowledgement",
      description: "Read the launch checklist and confirm that you understand the visitor flow.",
      time: "About 2 minutes",
      whatYouNeed: ["A few minutes to review how roles and visits work"],
      doneMeans:
        "You have confirmed you understand the visitor flow. Training for the rest of your team continues after launch.",
      href: "/dashboard/roles",
    },
    cran_evidence: {
      title: "CRAN device evidence",
      description: "Device-compliance evidence for connected radio hardware.",
      time: "About 5 minutes",
      whatYouNeed: ["Type-approval evidence for each regulated device"],
      doneMeans: "A device-compliance evidence pack is attached.",
      notNeeded: "Needed only for applicable connected hardware. Add it when you deploy that hardware.",
      href: "/dashboard/devices/compliance",
    },
    golive_approval: {
      title: "Billing and go-live",
      description: "Approve go-live once every required item is done. The dashboard opens after go-live.",
      time: "About 2 minutes",
      whatYouNeed: ["An active or trial subscription", "Your authenticator app"],
      doneMeans: "Your organisation is live and your team can sign in to work.",
      href: "/onboarding/golive-approval",
    },
  },
  /** One entry per backend evidence key (OnboardingEvidenceService.missingEvidence). */
  blockerCopy: {
    "organisation.legal_name": "Add your organisation's legal name.",
    "sites.at_least_one": "Create your first site.",
    "hosts.at_least_one": "Add at least one host.",
    "launch_route.chosen": "Choose a launch route.",
    "privacy_policy.published_version": "Publish the visitor privacy notice.",
    "retention_policy.at_least_one": "Create a retention policy.",
    "forms.version_with_fields": "Add at least one field to a visitor check-in form.",
    "site_qr.active": "Create a site QR code.",
    "kiosk_experience.config": "Configure the kiosk experience.",
    "site_branding.published_version": "Publish branding with a logo or brand colour.",
    "access_policy.at_least_one": "Create an access policy.",
    "devices.at_least_one": "Register at least one kiosk device.",
    "visits.test_visit": "Create a test visit.",
    "training.acknowledged": "Confirm you understand the visitor flow.",
    "evidence_pack.at_least_one": "Attach a device-compliance evidence pack.",
  },
  /** The action that clears a prerequisite blocker (§11.9.15.3: every blocker names its fix). */
  blockerFix: {
    "sites.at_least_one": { label: "Create a site", href: "/onboarding/site-hierarchy" },
    "hosts.at_least_one": { label: "Add a host", href: "/onboarding/hosts-departments" },
  },
  /** Prefix for go-live blockers: `step.<code>` means that checklist item is not done. */
  stepBlockerPrefix: "Complete: ",
} as const;

export type OnboardingStepCode = keyof typeof onboardingCopy.steps;
export type BlockerKey = keyof typeof onboardingCopy.blockerCopy;
export type BlockerFixKey = keyof typeof onboardingCopy.blockerFix;

export function blockerFix(key: string): { label: string; href: string } | null {
  return key in onboardingCopy.blockerFix ? onboardingCopy.blockerFix[key as BlockerFixKey] : null;
}

/** Human-readable text for a backend evidence key or `step.<code>` go-live blocker. */
export function blockerText(key: string): string {
  if (key.startsWith("step.")) {
    const code = key.slice("step.".length) as OnboardingStepCode;
    const step = onboardingCopy.steps[code];
    return step ? `${onboardingCopy.stepBlockerPrefix}${step.title}` : key;
  }
  return onboardingCopy.blockerCopy[key as BlockerKey] ?? key;
}

export type OnboardingStepSlug =
  | "organisation-profile"
  | "site-hierarchy"
  | "hosts-departments"
  | "launch-route"
  | "notices-retention"
  | "visitor-categories"
  | "check-in-channels"
  | "branding"
  | "risk-identity-approval"
  | "devices-mdm"
  | "flow-tests"
  | "role-training"
  | "cran-evidence"
  | "golive-approval";

/** Checklist order; matches backend ONBOARDING_STEPS. */
export const STEP_SLUG_TO_CODE: Record<OnboardingStepSlug, OnboardingStepCode> = {
  "organisation-profile": "organisation_profile",
  "site-hierarchy": "site_hierarchy",
  "hosts-departments": "hosts_departments",
  "launch-route": "launch_route",
  "notices-retention": "notices_retention",
  "visitor-categories": "visitor_categories",
  "check-in-channels": "check_in_channels",
  branding: "branding",
  "risk-identity-approval": "risk_identity_approval",
  "devices-mdm": "devices_mdm",
  "flow-tests": "flow_tests",
  "role-training": "role_training",
  "cran-evidence": "cran_evidence",
  "golive-approval": "golive_approval",
};

export const STEP_CODE_TO_SLUG = Object.fromEntries(
  Object.entries(STEP_SLUG_TO_CODE).map(([slug, code]) => [code, slug]),
) as Record<OnboardingStepCode, OnboardingStepSlug>;
