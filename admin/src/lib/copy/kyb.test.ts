import { describe, expect, it } from "vitest";

import { checkUpload, kybCopy, MAX_UPLOAD_BYTES, sourceBadge, statusText } from "./kyb";

describe("kyb copy", () => {
  it("refuses a file over the limit with a message that says what to do, and accepts the 4.2 MB scan that motivated the limit", () => {
    expect(checkUpload({ size: MAX_UPLOAD_BYTES + 1, type: "application/pdf" })).toBe(kybCopy.documents.tooLarge);
    expect(checkUpload({ size: 4_372_839, type: "application/pdf" })).toBeNull();
  });
  it("refuses other file types", () => {
    expect(checkUpload({ size: 1000, type: "application/zip" })).toBe(kybCopy.documents.wrongType);
  });
  it("labels each status and falls back to not started", () => {
    expect(statusText("needs_info")).toBe(kybCopy.status.needsInfo);
    expect(statusText(undefined)).toBe(kybCopy.status.none);
  });
  it("asks for extra care on hard-to-read values and says when the person changed one", () => {
    expect(sourceBadge("document", "medium")).toBe(kybCopy.badges.lowConfidence);
    expect(sourceBadge("document", "high")).toBe(kybCopy.badges.fromDocument);
    expect(sourceBadge("edited", "high")).toBe(kybCopy.badges.edited);
    expect(sourceBadge("typed", undefined)).toBeNull();
  });
  it("uses no emoji", () => {
    expect(JSON.stringify(kybCopy)).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
