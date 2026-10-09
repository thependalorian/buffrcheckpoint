import { exportPKCS8, generateKeyPair, SignJWT } from "jose";

import type { NewSigningKey, SigningKeyStatus, SigningKeyStore, StoredSigningKey } from "./signing-key.store";
import { KEY_LIFETIME_MS, KEY_OVERLAP_MS, TOKEN_ISSUER, TokenIssuerService } from "./token-issuer.service";
import { randomBytes } from "node:crypto";

class MemoryStore implements SigningKeyStore {
  rows: StoredSigningKey[] = [];
  log: string[] = [];
  constructor(private readonly clock: () => number) {}
  async listLive() {
    return this.rows
      .filter((r) => r.status !== "retired")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async insertActive(key: NewSigningKey, reasonCode: string) {
    this.rows.push({ id: key.kid, ...key, status: "active", verifyUntil: null, createdAt: new Date(this.clock()) });
    this.log.push(`${key.kid}:active:${reasonCode}`);
  }
  async setStatus(id: string, to: SigningKeyStatus, reasonCode: string, verifyUntil?: Date | null) {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return;
    row.status = to;
    if (verifyUntil !== undefined) row.verifyUntil = verifyUntil;
    this.log.push(`${id}:${to}:${reasonCode}`);
  }
}

const DAY = 24 * 60 * 60 * 1000;
let time = Date.UTC(2026, 9, 8, 12, 0, 0);

function build() {
  const store = new MemoryStore(() => time);
  const service = new TokenIssuerService(store as never);
  service.clock = () => time;
  return { store, service };
}

describe("token issuer (SE-1, SE-5)", () => {
  beforeAll(() => {
    process.env.MFA_SECRET_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    delete process.env.JWT_LEGACY_HS256_UNTIL;
  });
  beforeEach(() => {
    time = Date.UTC(2026, 9, 8, 12, 0, 0);
  });

  it("creates the first key and signs and verifies an EdDSA token carrying the claims", async () => {
    const { service, store } = build();
    expect(await service.rotateIfDue()).toBe("created");
    const token = await service.sign({ sub: "user-1", aud: "admin" }, 900);
    const payload = await service.verify(token);
    expect(payload).toMatchObject({ sub: "user-1", aud: "admin", iss: TOKEN_ISSUER });
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(900);
    expect(store.log[0]).toMatch(/:active:initial$/);
  });

  it("publishes public keys only", async () => {
    const { service } = build();
    await service.rotateIfDue();
    const set = await service.publicKeySet();
    expect(set.keys).toHaveLength(1);
    expect(set.keys[0]).toMatchObject({ kty: "OKP", crv: "Ed25519", alg: "EdDSA" });
    expect(JSON.stringify(set)).not.toContain('"d"');
  });

  it("refuses a tampered token and an expired token", async () => {
    const { service } = build();
    await service.rotateIfDue();
    const token = await service.sign({ sub: "user-1" }, 60);
    const [h, p, s] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "admin", iss: TOKEN_ISSUER })).toString("base64url");
    await expect(service.verify(`${h}.${forgedPayload}.${s}`)).rejects.toThrow();
    time += 61_000;
    await expect(service.verify(token)).rejects.toThrow();
  });

  it("refuses a token from another issuer, even with a valid signature from an unknown key", async () => {
    const { service } = build();
    await service.rotateIfDue();
    const { privateKey } = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
    await exportPKCS8(privateKey);
    const foreign = await new SignJWT({ sub: "user-1", aud: "admin" })
      .setProtectedHeader({ alg: "EdDSA", kid: "someone-else" })
      .setIssuer("another-service")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    await expect(service.verify(foreign)).rejects.toThrow();
  });

  it("refuses a token signed with the old shared secret unless the cutover window is open", async () => {
    const { service } = build();
    await service.rotateIfDue();
    process.env.JWT_SECRET = "s".repeat(48);
    const legacy = await new SignJWT({ sub: "user-1", aud: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(time / 1000))
      .setExpirationTime(Math.floor(time / 1000) + 600)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    await expect(service.verify(legacy)).rejects.toThrow();
    process.env.JWT_LEGACY_HS256_UNTIL = new Date(time + DAY).toISOString();
    await expect(service.verify(legacy)).resolves.toMatchObject({ sub: "user-1" });
    process.env.JWT_LEGACY_HS256_UNTIL = new Date(time - DAY).toISOString();
    await expect(service.verify(legacy)).rejects.toThrow();
    delete process.env.JWT_LEGACY_HS256_UNTIL;
  });

  it("rotates after 90 days, keeps the old key verifying for 30 days, then refuses its tokens", async () => {
    const { service, store } = build();
    await service.rotateIfDue();
    const oldToken = await service.sign({ sub: "user-1" }, (120 * DAY) / 1000);
    expect(await service.rotateIfDue()).toBe("none");

    time += KEY_LIFETIME_MS + 1000;
    expect(await service.rotateIfDue()).toBe("rotated");
    const newToken = await service.sign({ sub: "user-2" }, 600);
    expect(store.rows.filter((r) => r.status === "active")).toHaveLength(1);
    expect(store.rows.filter((r) => r.status === "retiring")).toHaveLength(1);
    await expect(service.verify(oldToken)).resolves.toMatchObject({ sub: "user-1" });
    await expect(service.verify(newToken)).resolves.toMatchObject({ sub: "user-2" });
    expect((await service.publicKeySet()).keys).toHaveLength(2);

    time += KEY_OVERLAP_MS + 1000;
    await service.rotateIfDue();
    expect(store.rows.filter((r) => r.status === "retired")).toHaveLength(1);
    await expect(service.verify(oldToken)).rejects.toThrow();
    const fresh = await service.sign({ sub: "user-3" }, 600);
    await expect(service.verify(fresh)).resolves.toMatchObject({ sub: "user-3" });
    expect((await service.publicKeySet()).keys).toHaveLength(1);
  });
});
