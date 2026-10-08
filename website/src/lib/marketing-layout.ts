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
export const marketingFeatureCard = "border-t border-border pt-6 sm:pt-8";
export const marketingCapabilityCard =
  "border-t border-border pt-6 pb-2 transition-colors duration-[var(--duration-fast)] hover:border-foreground";
export const marketingListCard = "border-b border-border py-4";
/** Subscription / plan cards — taller padding, equal-height flex column. */
export const marketingPricingCard = "flex min-w-0 flex-col border-t border-border pt-6 sm:pt-7 md:pr-6";
export const marketingPricingCardFeatured =
  "flex min-w-0 flex-col border-t-2 border-[var(--color-sodium-yellow)] pt-6 sm:pt-7 md:pr-6";
/** The accented counterpart of marketingFeatureCard: same layout, yellow top rule. */
export const marketingFeatureCardAccent = "border-t-2 border-[var(--color-sodium-yellow)] pt-6 sm:pt-8";
