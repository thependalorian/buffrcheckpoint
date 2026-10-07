import { exportJWK, generateKeyPair, type JWK, type KeyLike, SignJWT } from "jose";

import { BuffrIdService, buffrIdConfig, legacyPasswordAllowedForRole, legacyPasswordMode } from "./buffr-id.service";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

// A real JWKS endpoint served over HTTP and tokens signed with a real Ed25519 key, the way Buffr ID publishes and signs them.
describe("BuffrIdService", () => {
  let server: Server;
  let issuer: string;
  let privateKey: KeyLike;
  let otherKey: KeyLike;
  const saved = { ...process.env };

  beforeAll(async () => {
    const pair = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
    privateKey = pair.privateKey;
    otherKey = (await generateKeyPair("EdDSA", { crv: "Ed25519" })).privateKey;
    const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "EdDSA", use: "sig" };
    server = createServer((req, res) => {
      if (req.url === "/api/auth/jwks") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ keys: [jwk] }));
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    process.env.BUFFR_ID_ISSUER = issuer;
    process.env.BUFFR_ID_CLIENT_ID_ADMIN = "client-admin";
    process.env.BUFFR_ID_CLIENT_ID_OPS = "client-ops";
  });

  afterAll(async () => {
    process.env = saved;
    await new Promise((resolve) => server.close(resolve));
  });

  const token = (
    claims: Record<string, unknown> = {},
    opts: { key?: KeyLike; aud?: string; iss?: string; exp?: string; kid?: string } = {},
  ) =>
    new SignJWT({ email: "Owner@Firm.Example", email_verified: true, two_factor_enabled: true, ...claims })
      .setProtectedHeader({ alg: "EdDSA", kid: opts.kid ?? "k1" })
      .setSubject("buffr-id-subject-1")
      .setIssuer(opts.iss ?? issuer)
      .setAudience(opts.aud ?? "client-admin")
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? "10m")
      .sign(opts.key ?? privateKey);

  const service = new BuffrIdService();

  it("accepts a valid token and normalises the email", async () => {
    await expect(service.verifyIdToken(await token(), "admin")).resolves.toEqual({
      subject: "buffr-id-subject-1",
      email: "owner@firm.example",
      twoFactorEnabled: true,
    });
  });

  it("reports whether two-step sign-in is on, treating a missing claim as off", async () => {
    const t = await token({ two_factor_enabled: undefined });
    expect((await service.verifyIdToken(t, "admin")).twoFactorEnabled).toBe(false);
  });

  it("refuses a token for the other surface, a foreign issuer, an expired token and a stranger's key", async () => {
    await expect(service.verifyIdToken(await token({}, { aud: "client-ops" }), "admin")).rejects.toThrow(
      "Invalid Buffr ID sign-in",
    );
    await expect(service.verifyIdToken(await token({}, { aud: "client-admin" }), "ops")).rejects.toThrow(
      "Invalid Buffr ID sign-in",
    );
    await expect(service.verifyIdToken(await token({}, { iss: "https://evil.example" }), "admin")).rejects.toThrow(
      "Invalid Buffr ID sign-in",
    );
    await expect(service.verifyIdToken(await token({}, { exp: "-1m" }), "admin")).rejects.toThrow(
      "Invalid Buffr ID sign-in",
    );
    await expect(service.verifyIdToken(await token({}, { key: otherKey }), "admin")).rejects.toThrow(
      "Invalid Buffr ID sign-in",
    );
  });

  it("refuses an unsigned or symmetric-key token", async () => {
    const hs = await new SignJWT({ email: "a@b.example", email_verified: true })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("s")
      .setIssuer(issuer)
      .setAudience("client-admin")
      .setExpirationTime("10m")
      .sign(new TextEncoder().encode("shared-secret-shared-secret-shared"));
    await expect(service.verifyIdToken(hs, "admin")).rejects.toThrow("Invalid Buffr ID sign-in");
    await expect(service.verifyIdToken("not.a.jwt", "admin")).rejects.toThrow("Invalid Buffr ID sign-in");
  });

  it("checks the nonce when one is expected", async () => {
    const t = await token({ nonce: "n-123" });
    await expect(service.verifyIdToken(t, "admin", "n-123")).resolves.toMatchObject({ subject: "buffr-id-subject-1" });
    await expect(service.verifyIdToken(t, "admin", "other")).rejects.toThrow("Invalid Buffr ID sign-in");
    await expect(service.verifyIdToken(await token(), "admin", "n-123")).rejects.toThrow("Invalid Buffr ID sign-in");
  });

  it("refuses an email that Buffr ID has not verified", async () => {
    await expect(service.verifyIdToken(await token({ email_verified: false }), "admin")).rejects.toThrow(
      "did not confirm",
    );
    await expect(service.verifyIdToken(await token({ email: undefined }), "admin")).rejects.toThrow("did not confirm");
  });

  it("is disabled, and says so, when the issuer or a client id is missing", () => {
    expect(buffrIdConfig({})).toBeNull();
    expect(
      buffrIdConfig({
        BUFFR_ID_ISSUER: "https://id.buffr.ai/",
        BUFFR_ID_CLIENT_ID_ADMIN: "a",
        BUFFR_ID_CLIENT_ID_OPS: "o",
      }),
    ).toEqual({
      issuer: "https://id.buffr.ai",
      clientIds: { admin: "a", ops: "o" },
    });
  });
});

describe("legacy password sign-in modes", () => {
  it("defaults to on, and ignores unknown values", () => {
    expect(legacyPasswordMode({})).toBe("on");
    expect(legacyPasswordMode({ LEGACY_PASSWORD_AUTH: "banana" })).toBe("on");
    expect(legacyPasswordMode({ LEGACY_PASSWORD_AUTH: " Kiosk " })).toBe("kiosk");
  });

  it("kiosk mode leaves the password door open only for front-desk operators", () => {
    expect(legacyPasswordAllowedForRole("front_desk_operator", "kiosk")).toBe(true);
    for (const role of ["owner_operator", "site_manager", "platform_support", null]) {
      expect(legacyPasswordAllowedForRole(role, "kiosk")).toBe(false);
    }
    expect(legacyPasswordAllowedForRole("owner_operator", "on")).toBe(true);
    expect(legacyPasswordAllowedForRole("front_desk_operator", "off")).toBe(false);
  });
});
