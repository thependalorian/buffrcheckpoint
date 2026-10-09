import { BadRequestException } from "@nestjs/common";

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Reads the client's Idempotency-Key (MP-1). Absent is allowed so existing callers keep working; a key that is present
 * must be 8 to 128 letters, digits, underscores or hyphens, so it is safe to store and compare.
 *
 * @param raw - The header value as received.
 * @returns The key, or undefined when none was sent.
 */
export function parseIdempotencyKey(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  if (!KEY_PATTERN.test(value)) {
    throw new BadRequestException("Idempotency-Key must be 8 to 128 letters, digits, underscores or hyphens");
  }
  return value;
}
