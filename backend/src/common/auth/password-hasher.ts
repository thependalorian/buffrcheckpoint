import { type Algorithm, hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import * as bcrypt from "bcryptjs";

import { randomBytes } from "node:crypto";

/**
 * Argon2id cost (PW-1): time 3, memory 64 MiB, parallelism 2. These are the minimum the standard allows.
 * Raising one is a deliberate change: every hash below the new value is rehashed at the next successful sign-in.
 */
// The library declares Algorithm as an ambient const enum, which cannot be read under isolatedModules; Argon2id is value 2.
const ARGON2ID = 2 as Algorithm;

export const ARGON2_PARAMS = { algorithm: ARGON2ID, timeCost: 3, memoryCost: 65_536, parallelism: 2 } as const;

export type PasswordHashAlgorithm = "argon2id" | "bcrypt" | "unknown";

const ARGON2ID_PREFIX = "$argon2id$";
const ARGON2_PARAM_PATTERN = /^\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$/;
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$/;

/** Names the algorithm behind a stored hash. Used by sign-in and by the hash census. */
export function passwordHashAlgorithm(stored: string | null | undefined): PasswordHashAlgorithm {
  if (!stored) return "unknown";
  if (stored.startsWith(ARGON2ID_PREFIX)) return "argon2id";
  if (BCRYPT_PATTERN.test(stored)) return "bcrypt";
  return "unknown";
}

/**
 * Hashes a new password with Argon2id and a random salt (PW-1).
 *
 * @param plain - The password as chosen; length and policy are checked before this call.
 * @returns A PHC string holding the parameters, salt and hash.
 */
export function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, ARGON2_PARAMS);
}

/**
 * Checks a password against a stored hash of either supported kind. Never throws on a malformed hash.
 * Existing bcrypt hashes (created at 12 rounds) still verify so nobody is locked out; they are replaced at the next sign-in.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const algorithm = passwordHashAlgorithm(stored);
  try {
    if (algorithm === "argon2id") return await argonVerify(stored, plain);
    if (algorithm === "bcrypt") return await bcrypt.compare(plain, stored);
  } catch {
    return false;
  }
  return false;
}

/** True when the stored hash is not Argon2id at the current cost, so the caller should replace it after a successful check. */
export function passwordNeedsRehash(stored: string): boolean {
  const algorithm = passwordHashAlgorithm(stored);
  if (algorithm === "bcrypt") return true;
  if (algorithm === "unknown") return true;
  const match = ARGON2_PARAM_PATTERN.exec(stored);
  if (!match) return true;
  const [, memory, time, parallelism] = match.map(Number);
  return memory < ARGON2_PARAMS.memoryCost || time < ARGON2_PARAMS.timeCost || parallelism < ARGON2_PARAMS.parallelism;
}

let dummyHash: Promise<string> | null = null;

/**
 * A real Argon2id hash of a random value. Sign-in verifies against it when the account is unknown or locked, so those
 * paths take as long as a wrong password and the response timing does not reveal which case it was (PW-3).
 */
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(24).toString("hex"));
  return dummyHash;
}
