import { SUBPROCESSORS } from "./subprocessors";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The Privacy Policy on the website lists the same providers. If one list changes without the other, the policy would say something the
// product does not do, so this test compares them.
describe("subprocessor list matches the website Privacy Policy copy", () => {
  const site = readFileSync(join(__dirname, "../../../../website/src/lib/copy/privacy.ts"), "utf8");

  it.each(SUBPROCESSORS.map((s) => [s.name, s]))("%s is listed with the same purpose and region", (_name, s) => {
    expect(site).toContain(`name: "${s.name}"`);
    expect(site).toContain(`purpose: "${s.purpose}"`);
    expect(site).toContain(`region: "${s.region}"`);
  });

  it("lists no provider that the product does not use", () => {
    const names = [...site.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
    expect(names.sort()).toEqual(SUBPROCESSORS.map((s) => s.name).sort());
  });
});
