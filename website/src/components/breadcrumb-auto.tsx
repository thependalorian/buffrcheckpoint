"use client";

import { usePathname } from "next/navigation";

import { BreadcrumbJsonLd } from "@/components/json-ld";
import { SEO_PAGES, type SeoPageKey } from "@/lib/seo";

/** Adds breadcrumb data for whichever marketing page is showing, so no page has to remember to. The home page has no trail. */
export function BreadcrumbAuto() {
  const pathname = usePathname();
  const key = (Object.keys(SEO_PAGES) as SeoPageKey[]).find((k) => SEO_PAGES[k].path === pathname && pathname !== "/");
  return key ? <BreadcrumbJsonLd page={key} /> : null;
}
