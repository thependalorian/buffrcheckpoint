import Image from "next/image";

/** A report panel shown whole (no crop), so its question, finding and next step stay readable. */
export function ReportingFigure({
  src,
  width,
  height,
  alt,
  caption,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="bc-surface min-w-0 overflow-hidden">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="h-auto w-full"
      />
      <figcaption className="border-t border-border bg-background px-4 py-3.5 text-sm leading-snug text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
