import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

// HD-1: every web app sends HSTS (one year), frame denial, nosniff, a referrer policy, a permissions policy and a content security
// policy. The headers are declared in each app's Next.js config, so this test reads the declaration.
const apps: Array<[string, string]> = [
  ["website", "../../next.config.ts"],
  ["admin", "../../../admin/next.config.mjs"],
  ["ops-console", "../../../ops-console/next.config.ts"],
];

describe.each(apps)("%s security headers", (_name, relative) => {
  const config = readFileSync(resolve(__dirname, relative), "utf8");

  it.each([
    "Strict-Transport-Security",
    "max-age=31536000",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Content-Security-Policy",
    "frame-ancestors 'none'",
  ])("declares %s", (needle) => {
    expect(config).toContain(needle);
  });

  it("denies camera, microphone and geolocation", () => {
    expect(config).toContain("camera=(), microphone=(), geolocation=()");
  });
});
