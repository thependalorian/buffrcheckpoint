import { contactMailto } from "@/lib/copy/contact";
import { MARKETING_PRIMARY_CTA } from "@/lib/copy/signup";

/** Canonical marketing photography paths (public/marketing/). One distinct hero per route. */
export const MARKETING_HERO_IMAGES = {
  home: {
    src: "/marketing/hero-home-reception.png",
    alt: "",
  },
  about: {
    src: "/marketing/hero-about-windhoek.png",
    alt: "",
  },
  platform: {
    src: "/marketing/hero-platform-governance.png",
    alt: "",
  },
  pricing: {
    src: "/marketing/hero-pricing-planning.png",
    alt: "",
  },
  contact: {
    src: "/marketing/hero-contact-consultation.png",
    alt: "",
  },
  developers: {
    src: "/marketing/hero-developers-workspace.png",
    alt: "",
  },
  status: {
    src: "/marketing/hero-status-operations.png",
    alt: "",
  },
} as const;

/** Dedicated closing-band photography (`closing-*.png`) — never reuse hero assets. */
export const MARKETING_CLOSING_IMAGES = {
  home: {
    src: "/marketing/closing-home.png",
    alt: "",
  },
  about: {
    src: "/marketing/closing-about.png",
    alt: "",
  },
  platform: {
    src: "/marketing/closing-platform.png",
    alt: "",
  },
  pricing: {
    src: "/marketing/closing-pricing.png",
    alt: "",
  },
  contact: {
    src: "/marketing/closing-contact.png",
    alt: "",
  },
  developers: {
    src: "/marketing/closing-developers.png",
    alt: "",
  },
  status: {
    src: "/marketing/closing-status.png",
    alt: "",
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
        "Create your organisation account and set up your first site today. Verify your business, pay by EFT, and visitors start checking in.",
      href: MARKETING_PRIMARY_CTA.href,
      buttonLabel: MARKETING_PRIMARY_CTA.label,
    },
  },
  platform: {
    closing: MARKETING_CLOSING_IMAGES.platform,
    cta: {
      title: "Set it up for your own sites.",
      description: "Create an account, configure your sites, verify your business, and pay by EFT to go live.",
      href: MARKETING_PRIMARY_CTA.href,
      buttonLabel: MARKETING_PRIMARY_CTA.label,
    },
  },
  pricing: {
    closing: MARKETING_CLOSING_IMAGES.pricing,
    cta: {
      title: "Choose a plan and create your organisation account.",
      description: "Verify your business, pay by EFT, and upload the proof of payment under Billing. For a custom deployment, write to us through Contact.",
      href: MARKETING_PRIMARY_CTA.href,
      buttonLabel: MARKETING_PRIMARY_CTA.label,
    },
  },
  contact: {
    closing: MARKETING_CLOSING_IMAGES.contact,
    cta: {
      title: "Ready to set up your first site?",
      description: "Create your organisation account, add your sites, verify your business, and pay by EFT to go live.",
      href: MARKETING_PRIMARY_CTA.href,
      buttonLabel: MARKETING_PRIMARY_CTA.label,
    },
  },
  developers: {
    closing: MARKETING_CLOSING_IMAGES.developers,
    cta: {
      title: "Need to connect a system to Checkpoint?",
      description: "Email us with your organisation and what you want to connect, and we will agree the integration with you.",
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
