import { describe, expect, it } from "vitest";

import { secondsUntilExpiry } from "./token-expiry";

function token(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "EdDSA" })}.${encode(payload)}.signature`;
}

describe("secondsUntilExpiry", () => {
  it("returns the seconds left", () => {
    expect(secondsUntilExpiry(token({ exp: 1_000 + 600 }), 1_000_000)).toBe(600);
  });

  it("goes negative for an expired token", () => {
    expect(secondsUntilExpiry(token({ exp: 900 }), 1_000_000)).toBe(-100);
  });

  it("returns null for anything unreadable", () => {
    expect(secondsUntilExpiry("not-a-token")).toBeNull();
    expect(secondsUntilExpiry("a.%%%.c")).toBeNull();
    expect(secondsUntilExpiry(token({ sub: "no exp" }))).toBeNull();
  });
});
