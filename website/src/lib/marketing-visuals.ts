import { contactMailto } from "@/lib/copy/contact";
import { MARKETING_PRIMARY_CTA } from "@/lib/copy/signup";

/** Canonical marketing photography paths (public/marketing/). One distinct hero per route. */
export const MARKETING_HERO_IMAGES = {
  home: {
    src: "/marketing/hero-home-reception.png",
    alt: "Soft-focus modern reception space suggesting governed visitor access.",
  },
  about: {
    src: "/marketing/hero-about-windhoek.png",
    alt: "Warm skyline suggesting Namibia-built compliance software.",
  },
  platform: {
    src: "/marketing/hero-platform-governance.png",
    alt: "Modern secured lobby suggesting platform-wide access control.",
  },
  pricing: {
    src: "/marketing/hero-pricing-planning.png",
    alt: "Executive meeting space suggesting deployment and pricing planning.",
  },
  contact: {
    src: "/marketing/hero-contact-consultation.png",
    alt: "Consultation seating suggesting a conversation with the Checkpoint team.",
  },
  developers: {
    src: "/marketing/hero-developers-workspace.png",
    alt: "Developer workspace suggesting API integration work.",
  },
  status: {
    src: "/marketing/hero-status-operations.png",
    alt: "Operations environment suggesting platform reliability monitoring.",
  },
} as const;

/** Dedicated closing-band photography (`closing-*.png`) — never reuse hero assets. */
export const MARKETING_CLOSING_IMAGES = {
  home: {
    src: "/marketing/closing-home.png",
    alt: "Golden-hour city skyline suggesting regional compliance leadership.",
  },
  about: {
    src: "/marketing/closing-about.png",
    alt: "Sunlit atrium suggesting a Namibia-built enterprise team.",
  },
  platform: {
    src: "/marketing/closing-platform.png",
    alt: "Secure glass corridor suggesting governed physical access.",
  },
  pricing: {
    src: "/marketing/closing-pricing.png",
    alt: "Boardroom planning table suggesting deployment scoping.",
  },
  contact: {
    src: "/marketing/closing-contact.png",
    alt: "Consultation lounge suggesting a calm conversation with the team.",
  },
  developers: {
    src: "/marketing/closing-developers.png",
    alt: "Developer workstation suggesting API integration work.",
  },
  status: {
    src: "/marketing/closing-status.png",
    alt: "Operations indicators suggesting platform reliability monitoring.",
  },
} as const;

export type MarketingPageCloseKey = keyof typeof MARKETING_CLOSING_IMAGES;

export const MARKETING_PAGE_CLOSES = {
  home: {
    closing: MARKETING_CLOSING_IMAGES.home,
    cta: {
      title: "Retire the paper register before someone photographs the wrong page.",
      href: MARKETING_PRIMARY_CTA.href,
      buttonLabel: MARKETING_PRIMARY_CTA.label,
    },
  },
  about: {
    closing: MARKETING_CLOSING_IMAGES.about,
    cta: {
      title: "Start with your own visitor book.",
      description:
        "Create your organisation account and set up your first site today. Visitors start checking in once we confirm your first payment.",
      href: MARKETING_PRIMARY_CTA.href,
      buttonLabel: MARKETING_PRIMARY_CTA.label,
    },
  },
  platform: {
    closing: MARKETING_CLOSING_IMAGES.platform,
    cta: {
      title: "Set it up for your own sites.",
      description: "Create an account, configure your sites, and pay by EFT to go live.",
      href: MARKETING_PRIMARY_CTA.href,
      buttonLabel: MARKETING_PRIMARY_CTA.label,
    },
  },
  pricing: {
    closing: MARKETING_CLOSING_IMAGES.pricing,
    cta: {
      title: "Choose a plan and create your organisation account.",
      description: "Pay by EFT and upload the proof of payment under Billing. For a custom deployment, write to us through Contact.",
      href: MARKETING_PRIMARY_CTA.href,
      buttonLabel: MARKETING_PRIMARY_CTA.label,
    },
  },
  contact: {
    closing: MARKETING_CLOSING_IMAGES.contact,
    cta: {
      title: "Ready to set up your first site?",
      description: "Create your organisation account, add your sites, and pay by EFT to go live.",
      href: MARKETING_PRIMARY_CTA.href,
      buttonLabel: MARKETING_PRIMARY_CTA.label,
    },
  },
  developers: {
    closing: MARKETING_CLOSING_IMAGES.developers,
    cta: {
      title: "Need sandbox credentials or an integration review?",
      href: contactMailto("Developer access"),
      buttonLabel: "Email the team",
    },
  },
  status: {
    closing: MARKETING_CLOSING_IMAGES.status,
    cta: {
      title: "Incident or degraded check-in?",
      description: "Email us with URGENT in the subject line. Production check-in problems go to the front of the queue.",
      href: contactMailto("URGENT: check-in problem"),
      buttonLabel: "Report an issue",
    },
  },
} as const satisfies Record<
  MarketingPageCloseKey,
  {
    closing: (typeof MARKETING_CLOSING_IMAGES)[MarketingPageCloseKey];
    cta: {
      title: string;
      description?: string;
      href: string;
      buttonLabel: string;
    };
  }
>;
