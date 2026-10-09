import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { clampPageSize } from "./page-size";

describe("clampPageSize (API-5)", () => {
  it("cuts an oversize limit to the maximum", () => {
    expect(clampPageSize(100_000, 50, 200)).toBe(200);
    expect(clampPageSize("999999999", 50, 200)).toBe(200);
  });

  it("falls back to the default for missing, non-numeric, zero or negative values", () => {
    for (const bad of [undefined, "abc", "", Number.NaN, Number.POSITIVE_INFINITY, 0, -3, "-1"]) {
      expect(clampPageSize(bad, 50, 200)).toBe(50);
    }
  });

  it("keeps a valid limit and truncates a fraction", () => {
    expect(clampPageSize(25, 50, 200)).toBe(25);
    expect(clampPageSize("7.9", 50, 200)).toBe(7);
  });

  it("never returns more than the maximum even when the default is larger", () => {
    expect(clampPageSize(undefined, 500, 100)).toBe(100);
  });
});

// Every controller that reads a `limit` query value hands it to a service that clamps it with clampPageSize or the host search cap.
describe("list endpoints bound their page size (API-5)", () => {
  const modules = join(__dirname, "..", "..", "modules");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? files(full) : full.endsWith(".ts") && !full.endsWith(".spec.ts") ? [full] : [];
    });

  it("routes every limit query parameter into a bounded service", () => {
    const controllers = files(modules).filter(
      (f) => f.endsWith(".controller.ts") && /@Query\(\s*["']limit["']/.test(readFileSync(f, "utf8")),
    );
    expect(controllers.length).toBeGreaterThan(0);
    for (const controller of controllers) {
      const service = controller.replace(".controller.ts", ".service.ts");
      const text = readFileSync(service, "utf8") + (service.includes("hosts") ? readFileSync(join(service, "..", "host-search.ts"), "utf8") : "");
      expect({ controller, bounded: /clampPageSize\(|Math\.min\(Math\.trunc\(limit\)/.test(text) }).toEqual({
        controller,
        bounded: true,
      });
    }
  });

  it("does not leave an unclamped Math.min on a request limit", () => {
    const offenders = files(modules).filter((f) => /Math\.min\(input\.limit/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
