import { describe, expect, it } from "vitest";

import { FALLBACK_SECTORS, isSectorList } from "./sectors";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

describe("isSectorList", () => {
  it("accepts a non-empty list of code and label rows", () => {
    expect(isSectorList([{ code: "sme", label: "SME / corporate office" }])).toBe(true);
  });

  it("rejects anything else so the fallback is used", () => {
    expect(isSectorList([])).toBe(false);
    expect(isSectorList(null)).toBe(false);
    expect(isSectorList({ code: "sme", label: "SME" })).toBe(false);
    expect(isSectorList([{ code: "sme" }])).toBe(false);
    expect(isSectorList([{ code: 1, label: "x" }])).toBe(false);
  });

  it("keeps the fallback to the single catch-all, never a copy of the real list", () => {
    expect(FALLBACK_SECTORS).toEqual([{ code: "other", label: "Other" }]);
  });
});

/** The sector list is configuration served by the API. A copy in the app would drift and split analytics. */
describe("no hardcoded sector list in the admin app", () => {
  const SECTOR_ONLY_CODES = [
    "hospitality_tourism",
    "financial_services",
    "technology_telecom",
    "transport_logistics",
    "energy_utilities",
  ];

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return walk(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
  }

  it("has no source file that spells out sector codes", () => {
    const offenders = walk(join(__dirname, "..")).filter((file) => {
      const text = readFileSync(file, "utf8");
      return SECTOR_ONLY_CODES.some((code) => text.includes(code));
    });
    expect(offenders).toEqual([]);
  });
});
