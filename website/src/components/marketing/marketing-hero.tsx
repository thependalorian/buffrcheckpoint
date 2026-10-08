import Image from "next/image";
import type { ReactNode } from "react";

type MarketingHeroProps = {
  /** Path under /public, e.g. /marketing/hero-home-reception.png */
  backgroundSrc: string;
  backgroundAlt: string;
  children: ReactNode;
  /** Full-width split layout (home) vs narrower intro (inner pages). */
  layout?: "split" | "intro";
};

/**
 * Hero shell with photography or abstract backdrop, scrim, and optional grain.
 * PRD §11.6.5.3: atmosphere behind copy — not crowded reception photos with readable data.
 */
export function MarketingHero({ backgroundSrc, backgroundAlt, children, layout = "split" }: MarketingHeroProps) {
  return (
    <section className="relative isolate min-h-[min(32rem,70vh)] overflow-hidden border-b border-border">
      <Image
        src={backgroundSrc}
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(105deg,color-mix(in_srgb,var(--color-cloud)_92%,transparent)_0%,color-mix(in_srgb,var(--color-cloud)_78%,transparent)_45%,color-mix(in_srgb,var(--color-cloud)_55%,transparent)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-multiply [background-image:radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--color-sodium-yellow)_25%,transparent)_0%,transparent_45%),radial-gradient(circle_at_80%_0%,color-mix(in_srgb,var(--color-pure-white)_40%,transparent)_0%,transparent_40%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]"
        aria-hidden
      />

      <div
        className={
          layout === "split"
            ? "relative mx-auto grid min-w-0 max-w-7xl gap-10 px-4 py-16 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28"
            : "relative mx-auto min-w-0 max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
        }
      >
        {children}
      </div>
      {backgroundAlt ? <span className="sr-only">{backgroundAlt}</span> : null}
    </section>
  );
}
