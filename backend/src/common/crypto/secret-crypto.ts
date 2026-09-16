import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer {
  const raw = process.env.MFA_SECRET_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error("MFA_SECRET_ENCRYPTION_KEY must be set to at least 32 characters");
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(".");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted secret payload");
  }
  const decipher = createDecipheriv(ALGO, encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export function hashOpaqueToken(rawToken: string, pepperEnv = "EMAIL_VERIFICATION_PEPPER"): string {
  const pepper = process.env[pepperEnv] ?? process.env.JWT_SECRET ?? "dev-only-pepper-change-me";
  return createHash("sha256").update(`${pepper}:${rawToken}`).digest("hex");
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** Strip spaces/dashes so pasted authenticator codes still verify. */
export function normalizeTotpCode(raw: string): string {
  return raw.replace(/[\s\-]/g, "").trim();
}
