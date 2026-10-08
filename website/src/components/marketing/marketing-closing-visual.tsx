import Image from "next/image";

type MarketingClosingVisualProps = {
  backgroundSrc: string;
  backgroundAlt: string;
};

/**
 * Wide closing photograph above the bottom CTA band (PRD §11.6.5.3).
 * Lighter scrim than the hero so the scene reads as a breath before the ask.
 */
export function MarketingClosingVisual({ backgroundSrc, backgroundAlt }: MarketingClosingVisualProps) {
  return (
    <section className="relative isolate min-h-[min(16rem,38vw)] overflow-hidden border-b border-border sm:min-h-[min(20rem,42vw)]">
      <Image
        src={backgroundSrc}
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-cloud)_15%,transparent)_0%,color-mix(in_srgb,var(--color-cloud)_55%,transparent)_55%,color-mix(in_srgb,var(--color-cloud)_88%,transparent)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28] mix-blend-multiply [background-image:radial-gradient(circle_at_70%_30%,color-mix(in_srgb,var(--color-sodium-yellow)_22%,transparent)_0%,transparent_50%)]"
        aria-hidden
      />
      {backgroundAlt ? <span className="sr-only">{backgroundAlt}</span> : null}
    </section>
  );
}
