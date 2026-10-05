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
