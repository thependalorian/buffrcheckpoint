import { withinResendCooldown } from "./auth.service";

const now = new Date("2026-10-07T10:00:00.000Z");

describe("withinResendCooldown", () => {
  it("holds for a link that was issued seconds ago", () => {
    expect(withinResendCooldown(new Date("2026-10-07T10:00:00.000Z"), now, 60_000)).toBe(true);
    expect(withinResendCooldown(new Date("2026-10-07T09:59:30.000Z"), now, 60_000)).toBe(true);
  });

  it("opens once the window has passed, so a real resend still works", () => {
    expect(withinResendCooldown(new Date("2026-10-07T09:59:00.000Z"), now, 60_000)).toBe(false);
    expect(withinResendCooldown(new Date("2026-10-07T09:00:00.000Z"), now, 60_000)).toBe(false);
  });

  it("is exclusive at the boundary: exactly the cooldown ago is outside it", () => {
    expect(withinResendCooldown(new Date("2026-10-07T09:59:00.001Z"), now, 60_000)).toBe(true);
    expect(withinResendCooldown(new Date("2026-10-07T09:59:00.000Z"), now, 60_000)).toBe(false);
  });
});
