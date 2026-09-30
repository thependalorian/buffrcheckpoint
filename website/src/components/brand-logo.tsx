import Image from "next/image";

import { BRAND } from "@/lib/copy/brand";

/** Icon mark (branding/exports/icon-512.png) with the product name set in the heading font. */
export function BrandLogo({ size = "md", priority = false }: { size?: "md" | "lg"; priority?: boolean }) {
  const icon = size === "lg" ? "size-12" : "size-10 sm:size-11";
  const text = size === "lg" ? "text-2xl" : "text-xl sm:text-2xl";
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <Image src="/icon.png" alt="" aria-hidden width={96} height={96} priority={priority} className={`${icon} shrink-0 rounded-lg`} />
      <span className={`font-heading font-semibold tracking-tight text-foreground ${text}`}>{BRAND.productName}</span>
    </span>
  );
}
