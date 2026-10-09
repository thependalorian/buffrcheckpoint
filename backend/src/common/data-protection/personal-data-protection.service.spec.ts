import { PersonalDataProtectionService } from "./personal-data-protection.service";
import { createHash } from "node:crypto";

describe("PersonalDataProtectionService phone lookup", () => {
  const svc = new PersonalDataProtectionService();

  beforeAll(() => {
    process.env.PHONE_HASH_PEPPER = "test-pepper";
  });

  it("normalizes spacing and punctuation to the same digest", () => {
    const a = svc.lookupHmac("+264 81 111 9029", "PHONE_HASH_PEPPER");
    const b = svc.lookupHmac("+264811119029", "PHONE_HASH_PEPPER");
    expect(a).toBe(b);
  });

  it("phoneLookupHmacCandidates includes legacy trim+lower form", () => {
    const input = "+264 81 111 9029";
    const candidates = svc.phoneLookupHmacCandidates(input);
    const legacy = createHash("sha256").update(`test-pepper:${input.trim().toLowerCase()}`).digest("hex");
    expect(candidates).toContain(legacy);
    expect(candidates).toContain(svc.lookupHmac("+264811119029", "PHONE_HASH_PEPPER"));
  });
});

describe("PersonalDataProtectionService key ring (EN-2, EN-4)", () => {
  const svc = new PersonalDataProtectionService();
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("writes version 1 under the development key when no current key is configured (local runs)", () => {
    delete process.env.PERSONAL_DATA_KEY;
    const envelope = svc.encrypt("Anna N.");
    expect(envelope.keyVersion).toBe(1);
    expect(svc.decrypt(envelope)).toBe("Anna N.");
  });

  it("writes version 2 under PERSONAL_DATA_KEY and decrypts both versions during the rotation", () => {
    delete process.env.PERSONAL_DATA_KEY;
    const legacy = svc.encrypt("old value");
    process.env.PERSONAL_DATA_KEY = "k".repeat(48);
    const fresh = svc.encrypt("new value");
    expect(fresh.keyVersion).toBe(2);
    expect(fresh.keyManagementReference).toBe("platform-secret-store");
    expect(svc.decrypt(legacy)).toBe("old value");
    expect(svc.decrypt(fresh)).toBe("new value");
  });

  it("rotates a version 1 envelope to version 2, keeps the plaintext, and is idempotent", () => {
    delete process.env.PERSONAL_DATA_KEY;
    const legacy = svc.encrypt("0811119029");
    process.env.PERSONAL_DATA_KEY = "k".repeat(48);
    expect(svc.needsRotation(legacy)).toBe(true);
    const rotated = svc.rotateEnvelope(legacy);
    expect(rotated.keyVersion).toBe(2);
    expect(svc.decrypt(rotated)).toBe("0811119029");
    expect(svc.needsRotation(rotated)).toBe(false);
    expect(svc.rotateEnvelope(rotated)).toBe(rotated);
  });

  it("cannot decrypt a version 2 envelope with the wrong current key", () => {
    process.env.PERSONAL_DATA_KEY = "a".repeat(48);
    const envelope = svc.encrypt("secret");
    process.env.PERSONAL_DATA_KEY = "b".repeat(48);
    expect(() => svc.decrypt(envelope)).toThrow();
  });
});

describe("auth tag length (Semgrep gcm-no-tag-length)", () => {
  it("refuses an envelope whose authentication tag is truncated", () => {
    const svc = new PersonalDataProtectionService();
    const envelope = svc.encrypt("value");
    const short = {
      ...envelope,
      authenticationTag: Buffer.from(envelope.authenticationTag ?? "", "base64")
        .subarray(0, 4)
        .toString("base64"),
    };
    expect(() => svc.decrypt(short)).toThrow(/auth tag length/);
  });
});
