export const onboardingCopy = {
  shellTitle: "Setup",
  markComplete: "Save and return to setup",
  completing: "Saving...",
  skip: "Do this later",
  skipping: "Saving...",
  openConfig: "Open setup page",
  openSecondary: "Open related",
  backToOnboarding: "Back to setup",
  conflict: {
    withActor: (who: string) => `Setup changed by ${who} a moment ago.`,
    withoutActor: "Setup changed a moment ago.",
    refreshed: "We refreshed this page with the latest setup.",
    review: "Review latest status",
  },
  editing: (who: string, step: string) => `${who} is currently editing ${step}. Try again in a moment.`,
  genericError: "Could not save this step. Try again.",
  stillNeeded: "Still needed",
  banner: {
    message: "Setup is still in progress. Finish this page, then return to setup.",
  },
  overview: {
    reorganised: "We made setup shorter. Everything you already finished is still done.",
    route: {
      label: "Your launch route",
      notChosen: "QR-first is applied for you: no tablet needed.",
      change: "Use a dedicated kiosk instead",
      choose: "Choose route",
      summary: {
        qr_first: "Visitors check in on their phone. Your team can assist anyone without a phone.",
        kiosk: "Visitors check in on a tablet at reception. Your team can assist anyone who needs help.",
      },
    },
    sections: {
      required: "Required for launch",
      auto: "Set up for you",
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
  /** The Setup home: three steps for the owner, then what was done for them and what can wait. */
  home: {
    greeting: (organisationName: string) => `${organisationName} is ready for its first check-in`,
    intro:
      "We set up a first site, a check-in form, a visitor privacy notice and a retention period for you. Try it, review the standards, then go live.",
    progress: (done: number, total: number) => `${done} of ${total} done`,
    stepLabel: (n: number) => `Step ${n}`,
    done: "Done",
    settingUp: "We are setting up your check-in. This takes a moment.",
    setupFailed: "We could not finish setting up your check-in just now. Reload this page to try again.",
    tryIt: {
      title: "Try your check-in",
      description:
        "Scan this code with your phone and check in as a visitor. It is the same page your visitors will see.",
      time: "About 1 minute",
      qrAlt: "QR code that opens your visitor check-in",
      openHere: "Open the check-in on this device",
      noQr: "Your check-in code is being created. Reload this page in a moment.",
      afterScan: "Checked in? Refresh to see it here.",
      refresh: "Refresh",
      refreshing: "Checking...",
      saw: "We saw your check-in. Your check-in works.",
      confirm: "Confirm and continue",
      confirming: "Saving...",
      noVisitYet: "We have not seen a check-in yet. Scan the code, finish the form, then refresh.",
      orTitle: "Or let us check in a test visitor for you",
      printHint: "Print this code for reception from Site QR Codes whenever you are ready.",
      done: "Your check-in works.",
      doneNote: "Visitors will check in this way once you go live.",
    },
    standards: {
      title: "Review your standards",
      description:
        "These are Checkpoint's standard settings, ready to use. Accept them as they are, or change them first. You can also do this just before you go live.",
      time: "About 2 minutes",
      notice: "Visitor privacy notice",
      noticeStandard: "Checkpoint's standard wording",
      noticeEdited: "Edited by you",
      readNotice: "Read the notice",
      hideNotice: "Hide the notice",
      editNotice: "Edit notice",
      retention: "Keep visitor records for",
      retentionStandard: "Checkpoint's standard period",
      retentionEdited: "Set by you",
      days: (n: number) => (n === 1 ? "1 day" : `${n} days`),
      changeRetention: "Change period",
      form: "Check-in form",
      fields: (n: number) => (n === 1 ? "1 question" : `${n} questions`),
      asks: "Visitors are asked:",
      required: "required",
      editForm: "Edit form",
      noHighRisk:
        "No ID numbers, photographs, health or biometric information are asked for. Adding any of them needs a documented reason.",
      accept: "Accept these standards",
      accepting: "Saving...",
      accepted: "Accepted",
      acceptAgain: "Accept the current standards again",
      acceptedOn: (date: string) => `Accepted on ${date}`,
      again: "If you change something later, you can accept again.",
      responsibility:
        "Each organisation is responsible for its own legal obligations. Checkpoint's wording is designed to support privacy and retention controls: change it to suit yours.",
      notReady: "Your standards are being created. Reload this page in a moment.",
    },
    goLive: {
      title: "Go live",
      description: "When you go live, your team signs in to work and visitors check in for real.",
      time: "About 1 minute",
      beforeTitle: "Before you go live",
      plan: {
        label: "Plan",
        active: "Your plan is active.",
        trial: "You are on a trial.",
        none: "No plan yet. Buffr sets up your trial or sends you an invoice. Open Billing to see where you stand.",
        pending: "Your plan is waiting for Buffr to activate it.",
        open: "Open Billing",
      },
      kyb: {
        label: "Business verification",
        why: "Needed to activate a paid plan. You send your registration details and a copy of your registration document, and Buffr's team reviews them by hand.",
        none: "Not sent yet.",
        pending: "Sent. Buffr's team is reviewing it.",
        verified: "Verified.",
        rejected: "Not accepted. Please send it again.",
        expired: "Expired. Please send it again.",
        send: "Send business details",
        view: "View",
      },
      agreements: {
        label: "Agreements",
        ok: "You have accepted the current Terms and Privacy Policy.",
        pending: "The Terms and Privacy Policy changed. Please accept the current versions.",
        accept: "I accept the current",
        and: "and the",
        terms: "Terms and Conditions",
        privacy: "Privacy Policy",
      },
      acknowledge: "I have read how check-in works and I understand the visitor flow.",
      acknowledged: "You have confirmed how check-in works.",
      action: "Go live",
      acting: "Going live...",
      afterGoLive:
        "After you go live you will set up two-step sign-in. It is required once your organisation is live, and it takes a couple of minutes.",
      failed: "We could not take you live just now. Try again.",
      stillNeeded: "Before you can go live:",
      standardsFirst: "Accept your standards first (step 2).",
      tryFirst: "Try your check-in first (step 1).",
      planFirst: "Your plan must be active or on trial.",
      acknowledgeFirst: "Confirm you understand how check-in works.",
      agreementsFirst: "Accept the current Terms and Privacy Policy.",
    },
    setUpForYou: {
      title: "Set up for you",
      intro: "Checkpoint did these. Open any to review or change it.",
      review: "Review",
      needsAttention: "Needs attention",
    },
    addLater: {
      title: "Add later",
      intro: "Nothing here is needed to go live.",
    },
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
      description:
        "Your organisation's name is on record from sign-up and appears on visitor notices. Change it any time.",
      time: "Done for you",
      whatYouNeed: ["Nothing: it was taken from sign-up"],
      doneMeans: "Your organisation has a name on record.",
      href: "/dashboard/organisation",
    },
    site_hierarchy: {
      title: "First site",
      description:
        "We created a first site called Main reception. Rename it to match your building, or add more sites later.",
      time: "Done for you",
      whatYouNeed: ["Nothing: a first site was created for you"],
      doneMeans: "A site exists and is available for visitors.",
      href: "/dashboard/sites",
    },
    hosts_departments: {
      title: "Hosts and departments",
      description:
        "We added Reception as the first host, using your email, so arrival alerts reach you. Add the people visitors come to see whenever you are ready.",
      time: "Done for you",
      whatYouNeed: ["Nothing now. Add your team's hosts when you are ready"],
      doneMeans: "At least one host can receive visitors at your site.",
      href: "/dashboard/hosts",
    },
    launch_route: {
      title: "Launch route",
      description:
        "QR-first is applied for you: visitors check in on their own phone and your team can assist anyone without one. Choose a kiosk instead if you want a tablet at reception.",
      time: "Done for you",
      whatYouNeed: ["Nothing, unless you want a reception tablet"],
      doneMeans: "Your launch route is set. You can change it before you go live.",
      href: "/onboarding/launch-route",
    },
    notices_retention: {
      title: "Review your standards",
      description:
        "Checkpoint's standard visitor privacy notice, retention period and check-in form are ready. Accept them as they are, or change them first.",
      time: "About 2 minutes",
      whatYouNeed: ["A look at the notice, the retention period and the form"],
      doneMeans: "You have accepted your standards, or changed them and then accepted.",
      href: "/onboarding",
    },
    visitor_categories: {
      title: "Check-in form",
      description:
        "We set up Checkpoint's standard form. It asks only what a visit needs, and nothing sensitive. Edit it from your standards.",
      time: "Done for you",
      whatYouNeed: ["Nothing: the standard form is published"],
      doneMeans: "A check-in form with at least one question is published.",
      href: "/dashboard/policies/forms",
    },
    check_in_channels: {
      title: "Site QR code",
      description:
        "Your reception QR code is created. Print it from Site QR Codes. On the kiosk route you also set up the kiosk experience.",
      time: "Done for you",
      whatYouNeed: ["Nothing for QR-first. A kiosk needs its kiosk experience set up"],
      doneMeans: "Your site has an active QR code. On the kiosk route, the kiosk experience is also set up.",
      href: "/dashboard/site-experience/qr",
      secondaryHref: "/dashboard/site-experience/kiosk",
      secondaryLabel: "Kiosk experience",
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
      title: "Try your check-in",
      description: "Proves a visitor can check in before you go live.",
      time: "About 1 minute",
      whatYouNeed: ["A phone, or let us check in a test visitor for you"],
      doneMeans: "A check-in appears on your Front Desk roster.",
      href: "/onboarding",
    },
    role_training: {
      title: "Launch acknowledgement",
      description:
        "You confirm that you understand the visitor flow when you go live. Training for the rest of your team continues after launch.",
      time: "Done when you go live",
      whatYouNeed: ["Nothing separate: it is part of going live"],
      doneMeans: "You have confirmed you understand the visitor flow.",
      href: "/onboarding",
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
      title: "Go live",
      description:
        "Go live once you have tried your check-in and reviewed your standards. The dashboard opens after go-live.",
      time: "About 1 minute",
      whatYouNeed: ["An active or trial plan", "The current Terms and Privacy Policy accepted"],
      doneMeans: "Your organisation is live and your team can sign in to work.",
      href: "/onboarding",
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
    "standards.accepted": "Accept your standards, or change them first.",
    "legal.current_versions": "Accept the current Terms and Privacy Policy.",
    "forms.version_with_fields": "Add at least one field to a visitor check-in form.",
    "site_qr.active": "Create a site QR code.",
    "kiosk_experience.config": "Configure the kiosk experience.",
    "access_policy.at_least_one": "Create an access policy.",
    "devices.at_least_one": "Register at least one kiosk device.",
    "visits.test_visit": "Check in once, on your phone or with a test visitor.",
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
