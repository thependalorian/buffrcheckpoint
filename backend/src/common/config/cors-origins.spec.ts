import { corsOrigins } from "./cors-origins";

describe("corsOrigins", () => {
  it("denies everything when the list is unset or empty", () => {
    const warn = jest.fn();
    expect(corsOrigins(undefined, { warn })).toBe(false);
    expect(corsOrigins("  , ", { warn })).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("returns the trimmed explicit list", () => {
    expect(corsOrigins(" https://a.example.org , https://b.example.org ")).toEqual([
      "https://a.example.org",
      "https://b.example.org",
    ]);
  });
});
