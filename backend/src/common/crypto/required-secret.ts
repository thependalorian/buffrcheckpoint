/**
 * Secrets that protect personal data (data key, lookup peppers, token peppers) must never fall back to a
 * value that is visible in the source. In production a missing or weak value is an error, so the service
 * fails closed. Outside production the caller's development fallback is returned so local runs and tests work.
 */
export const MIN_SECRET_LENGTH = 16;

export function requiredSecret(envName: string, devFallback: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[envName];
  if (env.NODE_ENV === "production") {
    if (!value || value.length < MIN_SECRET_LENGTH) {
      throw new Error(`${envName} must be set to at least ${MIN_SECRET_LENGTH} characters in production`);
    }
    return value;
  }
  return value ?? devFallback;
}
