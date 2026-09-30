import Link from "next/link";

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
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <h2 className="max-w-3xl font-heading text-2xl font-light leading-tight tracking-tight text-[var(--color-carbon)] sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 max-w-2xl text-base text-[var(--color-carbon)]/80">{description}</p>
        ) : null}
        <div className="mt-8">
          <Link
            href={href}
            className="inline-flex items-center rounded-md bg-[var(--color-carbon)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {buttonLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
