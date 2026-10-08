import { describe, expect, it } from "vitest";

import { classifyApiHealth, classifyReachable } from "./status";

describe("status classification", () => {
  it("is operational only when the API and its database both answer ok", () => {
    expect(classifyApiHealth({ ok: true, body: { status: "ok", database: "ok" } })).toBe("operational");
  });
  it("is degraded when the API answers but a part is failing", () => {
    expect(classifyApiHealth({ ok: true, body: { status: "ok", database: "error" } })).toBe("degraded");
    expect(classifyApiHealth({ ok: true, body: {} })).toBe("degraded");
  });
  it("is unavailable when there is no answer or an error status, never a quiet pass", () => {
    expect(classifyApiHealth(null)).toBe("unavailable");
    expect(classifyApiHealth({ ok: false, body: null })).toBe("unavailable");
  });
  it("treats a redirect to sign-in as up, a server error as degraded and no answer as unavailable", () => {
    expect(classifyReachable(307)).toBe("operational");
    expect(classifyReachable(200)).toBe("operational");
    expect(classifyReachable(503)).toBe("degraded");
    expect(classifyReachable(null)).toBe("unavailable");
  });
});
