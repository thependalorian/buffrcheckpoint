import Image from "next/image";

type MarketingProductScreenshotProps = {
  src: string;
  alt: string;
  caption: string;
  /** Tailwind object-position utility, e.g. object-[50%_0%] */
  focusClassName?: string;
};

/** Admin screenshot in a filled frame — crop with cover, no letterboxing. */
export function MarketingProductScreenshot({
  src,
  alt,
  caption,
  focusClassName = "object-left-top",
}: MarketingProductScreenshotProps) {
  return (
    <figure className="bc-surface flex min-w-0 flex-col overflow-hidden">
      <div className="relative h-56 w-full overflow-hidden bg-[color-mix(in_srgb,var(--color-cloud)_70%,var(--color-pure-white))] sm:h-64 lg:h-[17.5rem]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={`object-cover ${focusClassName}`}
        />
      </div>
      <figcaption className="border-t border-border bg-background px-4 py-3.5 text-sm leading-snug text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
