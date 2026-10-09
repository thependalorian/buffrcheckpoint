import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { hashPassword } from "../../common/auth/password-hasher";
import { AuthService } from "./auth.service";

interface FakeUser {
  id: string;
  organisationId: string;
  email: string;
  passwordHash: string | null;
  failedLoginCount: number;
  lastFailedLoginAt: Date | null;
  lockedUntil: Date | null;
  emailVerifiedAt: Date | null;
  mfaEnabled: boolean;
}

function build(user: FakeUser | undefined) {
  const updates: Array<Record<string, unknown>> = [];
  const db = {
    query: { applicationUsers: { findFirst: async () => user } },
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: async () => undefined };
      },
    }),
  };
  const templatedEmail = { send: jest.fn(async () => undefined) };
  const service = new AuthService(
    db as never,
    {} as never,
    {} as never,
    {} as never,
    templatedEmail as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const check = (email: string, password: string) =>
    (service as unknown as { checkCredentials(e: string, p: string): Promise<FakeUser> }).checkCredentials(
      email,
      password,
    );
  return { check, updates, templatedEmail };
}

const baseUser = (over: Partial<FakeUser>): FakeUser => ({
  id: "11111111-1111-4111-8111-111111111111",
  organisationId: "22222222-2222-4222-8222-222222222222",
  email: "person@example.org",
  passwordHash: null,
  failedLoginCount: 0,
  lastFailedLoginAt: null,
  lockedUntil: null,
  emailVerifiedAt: new Date(),
  mfaEnabled: false,
  ...over,
});

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const e = error as UnauthorizedException;
    return { name: e.constructor.name, status: e.getStatus(), body: e.getResponse() };
  }
  throw new Error("expected a refusal");
}

describe("sign-in answers every refusal the same way (PW-3)", () => {
  it("unknown account, wrong password and locked account give one status and one body", async () => {
    const hash = await hashPassword("the right passphrase");
    const unknown = await failure(build(undefined).check("nobody@example.org", "whatever value"));
    const wrong = await failure(
      build(baseUser({ passwordHash: hash })).check("person@example.org", "wrong passphrase!"),
    );
    const locked = await failure(
      build(baseUser({ passwordHash: hash, lockedUntil: new Date(Date.now() + 120_000) })).check(
        "person@example.org",
        "the right passphrase",
      ),
    );
    expect(unknown).toEqual(wrong);
    expect(wrong).toEqual(locked);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toMatchObject({ message: "Invalid email or password" });
  });

  it("does not count an attempt against an account that is already locked", async () => {
    const hash = await hashPassword("the right passphrase");
    const { check, updates } = build(baseUser({ passwordHash: hash, lockedUntil: new Date(Date.now() + 120_000) }));
    await failure(check("person@example.org", "the right passphrase"));
    expect(updates).toHaveLength(0);
  });

  it("counts a wrong password against an account that is not locked", async () => {
    const hash = await hashPassword("the right passphrase");
    const { check, updates } = build(baseUser({ passwordHash: hash }));
    await failure(check("person@example.org", "wrong passphrase!"));
    expect(updates[0]).toMatchObject({ failedLoginCount: 1 });
  });

  it("refuses an account that has no password (Buffr ID only) like a wrong password", async () => {
    const result = await failure(
      build(baseUser({ passwordHash: null })).check("person@example.org", "anything at all"),
    );
    expect(result.status).toBe(401);
  });
});

describe("sign-in replaces old hashes (PW-1)", () => {
  it("replaces a bcrypt hash with Argon2id after a correct password", async () => {
    const legacy = await bcrypt.hash("legacy passphrase here", 12);
    const { check, updates } = build(baseUser({ passwordHash: legacy }));
    const user = await check("person@example.org", "legacy passphrase here");
    expect(user.id).toBeDefined();
    const replaced = updates.find((u) => typeof u.passwordHash === "string");
    expect(String(replaced?.passwordHash)).toMatch(/^\$argon2id\$/);
  });

  it("leaves a current Argon2id hash alone", async () => {
    const hash = await hashPassword("current passphrase here");
    const { check, updates } = build(baseUser({ passwordHash: hash }));
    await check("person@example.org", "current passphrase here");
    expect(updates.some((u) => "passwordHash" in u)).toBe(false);
  });
});
