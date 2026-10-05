import { describe, expect, it } from "vitest";

import { validateLogoFile } from "./branding";

describe("validateLogoFile", () => {
  it("rejects a 600 KB image with the named size before upload", () => {
    expect(validateLogoFile({ type: "image/png", size: 600_000 })).toBe(
      "This image is 600 KB. Choose an image under 400 KB.",
    );
  });

  it("rejects an unsupported type and accepts a valid logo", () => {
    expect(validateLogoFile({ type: "image/gif", size: 10_000 })).toBe("Logo must be a PNG, JPEG or WebP image.");
    expect(validateLogoFile({ type: "image/webp", size: 400_000 })).toBeNull();
  });
});
