import { describe, expect, it } from "vitest";

import { visitSurveyCopy } from "./visit-survey";

describe("visit survey copy", () => {
  it("matches the server's 1000 character comment limit", () => {
    expect(visitSurveyCopy.maxCommentLength).toBe(1000);
  });

  it("describes each star by number and label for screen readers", () => {
    expect(visitSurveyCopy.starLabel(4, "Good")).toBe("4 of 5 stars, Good");
    expect(visitSurveyCopy.chosen(5, "Very good")).toBe("5 of 5: Very good");
    expect(visitSurveyCopy.charactersLeft(990)).toBe("990 characters left");
  });

  it("has no emoji anywhere in its text", () => {
    const text = JSON.stringify(visitSurveyCopy);
    expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false);
  });
});
