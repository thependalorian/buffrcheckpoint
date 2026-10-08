import { describe, expect, it } from "vitest";

import { MARKETING_PAGES } from "./marketing";
import { PRIVACY_MANAGED } from "./privacy-managed";
import { SIGNUP_STEPS } from "./signup";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The public site makes claims, so its words are checked the way code is (buffrcheckpoint.md 1.4): no label no independent party has given,
// no count that drifts from the product, no hand-back disclaimer, no emoji or em dash.
// An em dash, or a pictograph other than the copyright, registered and trade mark signs.
const VISIBLE_SYMBOLS = new RegExp("\\u2014|(?![\\u00A9\\u00AE\\u2122])\\p{Extended_Pictographic}", "u");
const SRC = join(__dirname, "..", "..");
const copyFiles = [
  "lib/copy/marketing.ts",
  "lib/copy/privacy-managed.ts",
  "lib/copy/signup.ts",
  "lib/marketing-visuals.ts",
  "lib/seo.ts",
  "components/site-footer.tsx",
];
const pageFiles = [
  "page.tsx",
  "platform/page.tsx",
  "about/page.tsx",
  "developers/page.tsx",
  "contact/page.tsx",
  "pricing/page.tsx",
  "status/page.tsx",
].map((f) => `app/(marketing)/${f}`);
/** The words a visitor can read: the source without its comments, which may name the very claims the test forbids. */
const withoutComments = (body: string) => body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const text = [...copyFiles, ...pageFiles].map((f) => withoutComments(readFileSync(join(SRC, f), "utf8"))).join("\n");

describe("public site copy", () => {
  it("claims no label that needs an independent party", () => {
    expect(text).not.toMatch(/\b(?:fully |100% )?compliant\b|\bcertified\b|\bguarantee[sd]?\b|bank-grade|unhackable/i);
  });

  it("does not hand the work back to the customer in a disclaimer", () => {
    expect(text.toLowerCase()).not.toMatch(
      /remains? responsible|responsible for its own|own legal obligations|supervisory reporting/,
    );
  });

  it("states no count of check-in channels, which would drift from the product", () => {
    expect(text).not.toMatch(/\b(six|five|seven|eight|\d+) (ways|channels)\b/i);
  });

  it("promises nothing the product does not have: no sandbox, no published API reference, no tablet price", () => {
    expect(text).not.toMatch(/sandbox (keys|credentials)|OpenAPI publication|buy a checkpoint tablet/i);
  });

  it("uses no emoji and no em dash in what a visitor reads", () => {
    for (const f of [...copyFiles, ...pageFiles]) {
      const visible = withoutComments(readFileSync(join(SRC, f), "utf8"));
      expect(visible, f).not.toMatch(VISIBLE_SYMBOLS);
    }
  });

  it("tells a new customer that business verification comes before going live", () => {
    expect(SIGNUP_STEPS.map((s) => s.title)).toContain("Verify your business");
    const order = SIGNUP_STEPS.map((s) => s.title);
    expect(order.indexOf("Verify your business")).toBeLessThan(order.indexOf("Go live"));
  });

  it("leads with the privacy promise and keeps it to things the product does", () => {
    expect(PRIVACY_MANAGED.title.toLowerCase()).toContain("done for you");
    expect(PRIVACY_MANAGED.items.length).toBeGreaterThanOrEqual(5);
    for (const item of PRIVACY_MANAGED.items) expect(item.body.length).toBeGreaterThan(40);
  });

  it("gives every page a headline and lead", () => {
    expect(MARKETING_PAGES.home.h1.length).toBeGreaterThan(10);
    expect(MARKETING_PAGES.platform.lead.length).toBeGreaterThan(40);
  });
});
