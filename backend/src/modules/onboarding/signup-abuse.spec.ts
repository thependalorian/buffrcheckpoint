import { assessSignup, emailDomain, isFreeMailDomain } from "./signup-abuse";

const limits = { maxPendingPerDomain: 2, maxPerHour: 20 };
const ok = { email: "a@firm.example", pendingFromDomain: 0, createdLastHour: 0, limits };

describe("assessSignup", () => {
  it("lets an ordinary sign-up through", () => {
    expect(assessSignup(ok)).toBeNull();
  });

  it("refuses when the hidden field is filled in", () => {
    expect(assessSignup({ ...ok, honeypot: "https://spam.example" })).toBe("honeypot");
    expect(assessSignup({ ...ok, honeypot: "   " })).toBeNull();
  });

  it("limits pending sign-ups per company domain, but not for free-mail domains", () => {
    expect(assessSignup({ ...ok, pendingFromDomain: 2 })).toBe("domain_pending_limit");
    expect(assessSignup({ ...ok, email: "x@gmail.com", pendingFromDomain: 50 })).toBeNull();
  });

  it("limits sign-ups per hour overall", () => {
    expect(assessSignup({ ...ok, createdLastHour: 20 })).toBe("hourly_limit");
    expect(assessSignup({ ...ok, email: "x@gmail.com", createdLastHour: 20 })).toBe("hourly_limit");
  });

  it("reads the domain case-insensitively", () => {
    expect(emailDomain("Someone@Firm.Example")).toBe("firm.example");
    expect(isFreeMailDomain("gmail.com")).toBe(true);
  });
});
