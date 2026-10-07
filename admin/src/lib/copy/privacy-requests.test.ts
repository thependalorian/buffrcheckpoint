import { describe, expect, it } from "vitest";

import { deadlineClass, deadlineLabel } from "./privacy-requests";

describe("data request deadline copy", () => {
  it("states days left and days overdue plainly", () => {
    expect(deadlineLabel("open", 12, "2026-10-20T00:00:00Z")).toBe("20 Oct 2026 (12 days left)");
    expect(deadlineLabel("due_soon", 1, "2026-10-20T00:00:00Z")).toContain("1 day left");
    expect(deadlineLabel("overdue", -3, "2026-10-20T00:00:00Z")).toContain("3 days overdue");
  });

  it("shows only the date once closed, and a fallback with no deadline", () => {
    expect(deadlineLabel("closed", -40, "2026-10-20T00:00:00Z")).toBe("20 Oct 2026");
    expect(deadlineLabel("open", null, null)).toBe("No deadline recorded");
  });

  it("marks overdue and due-soon rows", () => {
    expect(deadlineClass("overdue")).toContain("destructive");
    expect(deadlineClass("due_soon")).toContain("sodium");
    expect(deadlineClass("open")).toContain("muted");
  });
});
