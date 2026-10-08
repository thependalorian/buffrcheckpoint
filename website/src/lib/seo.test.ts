import { describe, expect, it } from "vitest";

import { priceRange } from "@/components/json-ld";

import { absoluteUrl, hasGeneratedImage, PRIVATE_PATHS, pageMetadata, SEO_PAGES, type SeoPageKey } from "./seo";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const keys = Object.keys(SEO_PAGES) as SeoPageKey[];

describe("page metadata", () => {
  it("gives every page its own description of a useful length", () => {
    const descriptions = keys.map((k) => SEO_PAGES[k].description);
    expect(new Set(descriptions).size).toBe(keys.length);
    for (const d of descriptions) {
      expect(d.length).toBeGreaterThanOrEqual(70);
      expect(d.length).toBeLessThanOrEqual(165);
    }
  });

  it("gives every inner page a distinct title", () => {
    const titles = keys.map((k) => ("title" in SEO_PAGES[k] ? SEO_PAGES[k].title : "")).filter(Boolean);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("sets a canonical address, matching share data and a share image for every page", () => {
    for (const key of keys) {
      const meta = pageMetadata(key);
      expect(meta.alternates?.canonical).toBe(SEO_PAGES[key].path);
      expect((meta.openGraph as { url?: string }).url).toBe(SEO_PAGES[key].path);
      const hasImage = Boolean((meta.openGraph as { images?: unknown }).images);
      expect(hasImage).toBe(!hasGeneratedImage(key));
    }
  });

  it("has a generated share image file for each page that says it has one", () => {
    for (const key of keys.filter(hasGeneratedImage)) {
      const file = join(__dirname, "..", "app", "(marketing)", key, "opengraph-image.tsx");
      expect(() => readFileSync(file, "utf8")).not.toThrow();
    }
  });

  it("uses pageMetadata on every marketing page, so none falls back to the defaults", () => {
    for (const key of keys) {
      const file =
        key === "home"
          ? join(__dirname, "..", "app", "(marketing)", "page.tsx")
          : join(__dirname, "..", "app", "(marketing)", key, "page.tsx");
      expect(readFileSync(file, "utf8")).toContain(`pageMetadata("${key}")`);
    }
  });

  it("lists absolute addresses without a trailing slash except the home page", () => {
    expect(absoluteUrl("/")).toMatch(/^https:\/\/[^/]+$/);
    expect(absoluteUrl("/pricing")).toMatch(/\/pricing$/);
  });

  it("keeps the visitor pages out of the crawl", () => {
    for (const path of PRIVATE_PATHS) expect(keys.map((k) => SEO_PAGES[k].path)).not.toContain(path);
  });
});

describe("structured data prices", () => {
  it("reads the lowest and highest monthly price from the plans", () => {
    expect(
      priceRange([
        { label: "Site", monthlyAmount: "1500.00", currencyCode: "NAD" },
        { label: "Assure", monthlyAmount: "9500.00", currencyCode: "NAD" },
      ]),
    ).toEqual({ low: 1500, high: 9500, currency: "NAD" });
  });
  it("gives nothing, not an invented price, when there are no plans", () => {
    expect(priceRange([])).toBeNull();
  });
});
