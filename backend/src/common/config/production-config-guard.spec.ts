import { assertProductionConfig, productionConfigProblems, productionConfigWarnings } from "./production-config-guard";
import { randomBytes } from "node:crypto";

const SECRET_NAMES = [
  "JWT_SECRET",
  "PERSONAL_DATA_KEY",
  "PHONE_HASH_PEPPER",
  "NAME_HASH_PEPPER",
  "CONTACT_REFERENCE_HASH_PEPPER",
  "QR_TOKEN_PEPPER",
  "EMAIL_VERIFICATION_PEPPER",
  "MFA_CHALLENGE_PEPPER",
  "MFA_SECRET_ENCRYPTION_KEY",
];

function goodEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    CORS_ORIGIN: "https://buffrcheckpoint.com,https://admin.buffrcheckpoint.com",
    DATABASE_URL: "postgresql://runtime:pw@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require",
  };
  for (const name of SECRET_NAMES) env[name] = randomBytes(48).toString("hex");
  return env;
}

describe("productionConfigProblems", () => {
  it("returns nothing outside production so local runs start", () => {
    expect(productionConfigProblems({ NODE_ENV: "development" })).toEqual([]);
    expect(productionConfigProblems({})).toEqual([]);
  });

  it("accepts a fully configured production environment", () => {
    expect(productionConfigProblems(goodEnv())).toEqual([]);
    expect(() => assertProductionConfig(goodEnv())).not.toThrow();
  });

  it.each(SECRET_NAMES)("refuses a missing %s", (name) => {
    const env = goodEnv();
    delete env[name];
    expect(productionConfigProblems(env)).toContainEqual({ variable: name, reason: "is not set" });
  });

  it("refuses a signing secret under 32 characters", () => {
    const env = { ...goodEnv(), JWT_SECRET: "a".repeat(31) };
    expect(productionConfigProblems(env).map((p) => p.variable)).toContain("JWT_SECRET");
  });

  it("refuses a purpose secret under 16 characters", () => {
    const env = { ...goodEnv(), QR_TOKEN_PEPPER: "short" };
    expect(productionConfigProblems(env).map((p) => p.variable)).toContain("QR_TOKEN_PEPPER");
  });

  it("refuses a placeholder or development value", () => {
    const env = { ...goodEnv(), JWT_SECRET: "<generate-a-real-random-secret-do-not-reuse-this-example>" };
    expect(
      productionConfigProblems(env).some((p) => p.variable === "JWT_SECRET" && p.reason.includes("placeholder")),
    ).toBe(true);
  });

  it("refuses one value shared by two purposes", () => {
    const env = goodEnv();
    env.PHONE_HASH_PEPPER = env.NAME_HASH_PEPPER;
    const found = productionConfigProblems(env).find(
      (p) => p.variable === "NAME_HASH_PEPPER" || p.variable === "PHONE_HASH_PEPPER",
    );
    expect(found?.reason).toContain("same value");
  });

  it("refuses an unset CORS allow-list", () => {
    const env = goodEnv();
    delete env.CORS_ORIGIN;
    expect(productionConfigProblems(env).map((p) => p.variable)).toContain("CORS_ORIGIN");
  });

  it.each(["*", "true", "https://*.example.org", "http://buffrcheckpoint.com"])(
    "refuses the CORS origin %s",
    (origin) => {
      const env = { ...goodEnv(), CORS_ORIGIN: `https://admin.buffrcheckpoint.com,${origin}` };
      expect(productionConfigProblems(env).map((p) => p.variable)).toContain("CORS_ORIGIN");
    },
  );

  it.each(["disable", "allow", "prefer"])("refuses a database URL with sslmode=%s", (mode) => {
    const env = { ...goodEnv(), DATABASE_URL: `postgresql://u:p@host.example.org/db?sslmode=${mode}` };
    expect(productionConfigProblems(env).map((p) => p.variable)).toContain("DATABASE_URL");
  });

  it("refuses a non-Neon database URL with no sslmode", () => {
    const env = { ...goodEnv(), DATABASE_URL: "postgresql://u:p@db.internal:5432/app" };
    expect(productionConfigProblems(env).map((p) => p.variable)).toContain("DATABASE_URL");
  });

  it("accepts verify-full", () => {
    const env = { ...goodEnv(), DATABASE_URL: "postgresql://u:p@ep-x.neon.tech/db?sslmode=verify-full" };
    expect(productionConfigProblems(env)).toEqual([]);
  });

  it("refuses a sandbox payment rail", () => {
    const env = { ...goodEnv(), ADUMO_BASE_URL: "https://sandbox.adumoonline.com" };
    expect(productionConfigProblems(env).map((p) => p.variable)).toContain("ADUMO_BASE_URL");
  });

  it("names every problem in the thrown error and never prints a value", () => {
    const env: NodeJS.ProcessEnv = { ...goodEnv(), JWT_SECRET: "tiny-secret-value-7f3a" };
    delete env.CORS_ORIGIN;
    let message = "";
    try {
      assertProductionConfig(env);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("JWT_SECRET");
    expect(message).toContain("CORS_ORIGIN");
    expect(message).not.toContain("tiny-secret-value-7f3a");
  });

  it("refuses the public development data key as the current key", () => {
    const env = { ...goodEnv(), PERSONAL_DATA_KEY: "local-dev-only-insecure-key-do-not-deploy!!" };
    expect(productionConfigProblems(env).map((p) => p.variable)).toContain("PERSONAL_DATA_KEY");
  });

  it("warns, and does not refuse, while the retired version 1 key is still set", () => {
    const env = { ...goodEnv(), LOCAL_DEV_DATA_KEY: "anything-at-all-still-set" };
    expect(productionConfigProblems(env)).toEqual([]);
    expect(productionConfigWarnings(env).map((w) => w.variable)).toEqual(["LOCAL_DEV_DATA_KEY"]);
    expect(productionConfigWarnings(goodEnv())).toEqual([]);
  });
});
