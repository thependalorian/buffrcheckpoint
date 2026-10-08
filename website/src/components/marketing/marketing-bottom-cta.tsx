import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingWideSection } from "@/lib/marketing-layout";

type MarketingBottomCtaProps = {
  title: string;
  description?: string;
  href: string;
  buttonLabel: string;
};

/** High-contrast closing ask — sits directly above the site footer. */
export function MarketingBottomCta({ title, description, href, buttonLabel }: MarketingBottomCtaProps) {
  return (
    <section className="bg-[var(--color-sodium-yellow)]">
      <div className={marketingWideSection}>
        <h2 className="max-w-3xl font-heading text-2xl font-light leading-tight tracking-tight text-[var(--color-carbon)] sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {description ? <p className="mt-4 max-w-2xl text-base text-[var(--color-carbon)]/80">{description}</p> : null}
        <div className="mt-8">
          <MarketingCta href={href} variant="ink">
            {buttonLabel}
          </MarketingCta>
        </div>
      </div>
    </section>
  );
}
