import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("allows relative dashboard paths", () => {
    expect(safeNextPath("/dashboard/overview")).toBe("/dashboard/overview");
    expect(safeNextPath("/auth/mfa/setup")).toBe("/auth/mfa/setup");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.example/phish")).toBe("/dashboard/overview");
    expect(safeNextPath("//evil.example/phish")).toBe("/dashboard/overview");
    expect(safeNextPath("http://localhost:3000/dashboard")).toBe("/dashboard/overview");
  });

  it("rejects backslash and control characters", () => {
    expect(safeNextPath("/\\evil")).toBe("/dashboard/overview");
    expect(safeNextPath("/dashboard\n/evil")).toBe("/dashboard/overview");
  });
});
