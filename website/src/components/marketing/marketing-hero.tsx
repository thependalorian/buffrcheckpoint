import type { ReactNode } from "react";

type MarketingHeroProps = {
  /** Kept so existing pages compile; the hero no longer sits on a photograph. */
  backgroundSrc?: string;
  backgroundAlt?: string;
  children: ReactNode;
  /** Full-width split layout (home) vs left-aligned intro (inner pages). */
  layout?: "split" | "intro";
};

/**
 * Hero on the clean canvas: no photo wash, a yellow marker rule, a faint dot grid that fades out
 * to the right, and a hairline underneath. Copy keeps full contrast because nothing sits behind it.
 */
export function MarketingHero({ children, layout = "split" }: MarketingHeroProps) {
  return (
    <section className="bc-hero relative isolate overflow-hidden border-b border-border bg-background">
      <div aria-hidden className="bc-hero-grid pointer-events-none absolute inset-0" />
      <span aria-hidden className="absolute top-0 left-0 h-1 w-24 bg-[var(--color-sodium-yellow)] sm:w-40" />
      <div
        className={
          layout === "split"
            ? "relative mx-auto grid min-w-0 max-w-7xl items-center gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8 lg:py-24"
            : "bc-hero-intro relative mx-auto min-w-0 max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20"
        }
      >
        {layout === "intro" ? <div className="max-w-3xl">{children}</div> : children}
      </div>
    </section>
  );
}
