import { BadRequestException } from "@nestjs/common";

import { parseIdempotencyKey } from "./idempotency-key";

describe("parseIdempotencyKey (MP-1)", () => {
  it("returns undefined when no key is sent", () => {
    expect(parseIdempotencyKey(undefined)).toBeUndefined();
    expect(parseIdempotencyKey("")).toBeUndefined();
  });

  it("accepts a well-formed key and the first of a repeated header", () => {
    expect(parseIdempotencyKey("a1b2c3d4-e5f6")).toBe("a1b2c3d4-e5f6");
    expect(parseIdempotencyKey(["abcdefgh", "ignored-second"])).toBe("abcdefgh");
  });

  it.each(["short", "has space in it", "semi;colon-key", "x".repeat(129), "emoji-\u{1F600}-key"])(
    "refuses %s",
    (bad) => {
      expect(() => parseIdempotencyKey(bad)).toThrow(BadRequestException);
    },
  );
});
