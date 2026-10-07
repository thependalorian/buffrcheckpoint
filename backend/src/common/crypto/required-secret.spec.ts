import { requiredSecret } from "./required-secret";

describe("requiredSecret", () => {
  it("returns the development fallback outside production", () => {
    expect(requiredSecret("X_SECRET", "dev", { NODE_ENV: "test" })).toBe("dev");
    expect(requiredSecret("X_SECRET", "dev", {})).toBe("dev");
  });

  it("returns the configured value when set", () => {
    expect(requiredSecret("X_SECRET", "dev", { NODE_ENV: "test", X_SECRET: "configured" })).toBe("configured");
  });

  it("throws in production when the value is missing", () => {
    expect(() => requiredSecret("X_SECRET", "dev", { NODE_ENV: "production" })).toThrow(/X_SECRET/);
  });

  it("throws in production when the value is too short", () => {
    expect(() => requiredSecret("X_SECRET", "dev", { NODE_ENV: "production", X_SECRET: "short" })).toThrow(/at least 16/);
  });

  it("accepts a strong value in production", () => {
    const value = "a-long-random-secret-value-1234";
    expect(requiredSecret("X_SECRET", "dev", { NODE_ENV: "production", X_SECRET: value })).toBe(value);
  });
});
