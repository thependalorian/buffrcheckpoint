import * as bcrypt from "bcryptjs";

import {
  ARGON2_PARAMS,
  dummyPasswordHash,
  hashPassword,
  passwordHashAlgorithm,
  passwordNeedsRehash,
  verifyPassword,
} from "./password-hasher";

describe("password hasher (PW-1)", () => {
  it("hashes new passwords with Argon2id at 64 MiB, time 3, parallelism 2", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=2\$/);
    expect(ARGON2_PARAMS).toMatchObject({ memoryCost: 65_536, timeCost: 3, parallelism: 2 });
    expect(passwordHashAlgorithm(hash)).toBe("argon2id");
    expect(passwordNeedsRehash(hash)).toBe(false);
  });

  it("uses a different salt every time", async () => {
    expect(await hashPassword("same password here")).not.toBe(await hashPassword("same password here"));
  });

  it("verifies the right password and refuses a wrong one", async () => {
    const hash = await hashPassword("blue tractor sings");
    expect(await verifyPassword("blue tractor sings", hash)).toBe(true);
    expect(await verifyPassword("blue tractor sing", hash)).toBe(false);
  });

  it("accepts a 128 character passphrase and does not cut it short", async () => {
    const long = "a".repeat(127);
    const hash = await hashPassword(`${long}x`);
    expect(await verifyPassword(`${long}x`, hash)).toBe(true);
    expect(await verifyPassword(`${long}y`, hash)).toBe(false);
  });

  it("still verifies a legacy bcrypt hash and marks it for replacement", async () => {
    const legacy = await bcrypt.hash("legacy password value", 12);
    expect(passwordHashAlgorithm(legacy)).toBe("bcrypt");
    expect(await verifyPassword("legacy password value", legacy)).toBe(true);
    expect(await verifyPassword("something else entirely", legacy)).toBe(false);
    expect(passwordNeedsRehash(legacy)).toBe(true);
  });

  it("marks an Argon2id hash below the current cost for replacement", () => {
    expect(passwordNeedsRehash("$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$aGFzaA")).toBe(true);
  });

  it("returns false, and never throws, for a malformed or empty hash", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "$argon2id$garbage")).toBe(false);
    expect(passwordHashAlgorithm(null)).toBe("unknown");
    expect(passwordNeedsRehash("not-a-hash")).toBe(true);
  });

  it("provides one real Argon2id dummy hash for timing parity", async () => {
    const first = await dummyPasswordHash();
    expect(first).toMatch(/^\$argon2id\$/);
    expect(await dummyPasswordHash()).toBe(first);
  });
});
