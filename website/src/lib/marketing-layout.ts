/** Shared Tailwind shells for public marketing pages (overflow-safe, responsive padding). */
export const marketingWideSection = "mx-auto min-w-0 max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24";
export const marketingNarrowSection = "mx-auto min-w-0 max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24";
export const marketingPageTitle =
  "font-heading text-3xl font-light leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl";
export const marketingSectionTitle =
  "font-heading text-2xl font-light tracking-tight text-foreground sm:text-3xl lg:text-4xl";

/** Refero-inspired surfaces from buffr-checkpoint.css (`.bc-*`) — flat hairline panels, no drop shadows. */
export const marketingSurface = "bc-surface";
export const marketingSurfaceMuted = "bc-surface-muted";
export const marketingSurfaceInset = "bc-surface-inset";
export const marketingEyebrow = "bc-marketing-eyebrow";
export const marketingLead = "bc-marketing-lead";
export const marketingFeatureCard = "bc-surface p-6 sm:p-8";
export const marketingCapabilityCard =
  "bc-surface p-6 transition-colors duration-[var(--duration-fast)] hover:border-[var(--border-strong)]";
export const marketingListCard = "bc-surface p-4";
/** Subscription / plan cards — taller padding, equal-height flex column. */
export const marketingPricingCard = "bc-surface flex min-w-0 flex-col p-6 sm:p-7";
export const marketingPricingCardFeatured = `${marketingPricingCard} bc-pricing-featured`;
