import { MIN_SECRET_LENGTH } from "../crypto/required-secret";
import { createHash } from "node:crypto";

/** Secrets that protect personal data or sign tokens. Each needs its own value in production (SC-1, SC-2). */
const PURPOSE_SECRETS = [
  "LOCAL_DEV_DATA_KEY",
  "PHONE_HASH_PEPPER",
  "NAME_HASH_PEPPER",
  "CONTACT_REFERENCE_HASH_PEPPER",
  "QR_TOKEN_PEPPER",
  "EMAIL_VERIFICATION_PEPPER",
  "MFA_CHALLENGE_PEPPER",
  "MFA_SECRET_ENCRYPTION_KEY",
] as const;

const SIGNING_SECRET = "JWT_SECRET";
const MIN_SIGNING_SECRET_LENGTH = 32;
const PLACEHOLDER_MARKERS = ["change-me", "do-not-reuse", "<generate", "dev-only", "example", "changeme"];
const TLS_MODES = new Set(["require", "verify-ca", "verify-full"]);
const SIMULATOR_MARKERS = ["sandbox", "staging", "simulator", "mock"];

/**
 * The personal-data key that ships in the source for local development. Production data was first written under it, so it cannot be
 * refused at start-up without taking the service down: it is reported as a critical warning until the data is re-encrypted under a new
 * key (blueprint 14.3, Annex E EN-2). Any other placeholder value is still refused.
 */
export const KNOWN_DEV_DATA_KEY = "local-dev-only-insecure-key-do-not-deploy!!";

export interface ConfigProblem {
  variable: string;
  reason: string;
}

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function secretProblems(env: NodeJS.ProcessEnv): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  const seen = new Map<string, string>();
  const checks: Array<{ name: string; min: number }> = [
    { name: SIGNING_SECRET, min: MIN_SIGNING_SECRET_LENGTH },
    ...PURPOSE_SECRETS.map((name) => ({ name, min: MIN_SECRET_LENGTH })),
  ];
  for (const { name, min } of checks) {
    const value = env[name];
    if (!value) {
      problems.push({ variable: name, reason: "is not set" });
      continue;
    }
    if (value.length < min) problems.push({ variable: name, reason: `is shorter than ${min} characters` });
    if (name === "LOCAL_DEV_DATA_KEY" && value === KNOWN_DEV_DATA_KEY) continue;
    if (looksLikePlaceholder(value))
      problems.push({ variable: name, reason: "holds a placeholder or development value" });
    const key = digest(value);
    const other = seen.get(key);
    if (other) problems.push({ variable: name, reason: `has the same value as ${other}; use one secret per purpose` });
    else seen.set(key, name);
  }
  return problems;
}

function corsProblems(env: NodeJS.ProcessEnv): ConfigProblem[] {
  const raw = env.CORS_ORIGIN?.trim();
  if (!raw) return [{ variable: "CORS_ORIGIN", reason: "is not set; production needs an explicit origin allow-list" }];
  const origins = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const problems: ConfigProblem[] = [];
  for (const origin of origins) {
    if (origin === "*" || origin === "true" || origin.includes("*")) {
      problems.push({ variable: "CORS_ORIGIN", reason: "contains a wildcard origin" });
    } else if (!origin.startsWith("https://")) {
      problems.push({ variable: "CORS_ORIGIN", reason: "contains an origin that is not https" });
    }
  }
  return problems;
}

function databaseProblems(env: NodeJS.ProcessEnv): ConfigProblem[] {
  const raw = env.DATABASE_URL;
  if (!raw) return [{ variable: "DATABASE_URL", reason: "is not set" }];
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return [{ variable: "DATABASE_URL", reason: "is not a valid connection URL" }];
  }
  const mode = url.searchParams.get("sslmode");
  if (mode ? !TLS_MODES.has(mode) : !url.hostname.endsWith(".neon.tech")) {
    return [
      { variable: "DATABASE_URL", reason: "does not require TLS (sslmode must be require, verify-ca or verify-full)" },
    ];
  }
  return [];
}

function railProblems(env: NodeJS.ProcessEnv): ConfigProblem[] {
  const base = env.ADUMO_BASE_URL?.toLowerCase();
  if (base && SIMULATOR_MARKERS.some((marker) => base.includes(marker))) {
    return [{ variable: "ADUMO_BASE_URL", reason: "points at a sandbox or simulator payment rail" }];
  }
  return [];
}

/**
 * Lists every production configuration that the standard says must stop the service from starting (SC-1, SC-2, HD-2, EN-1).
 * Returns variable names and reasons only, never values. Outside production it returns nothing, so local runs and tests start.
 */
export function productionConfigProblems(env: NodeJS.ProcessEnv = process.env): ConfigProblem[] {
  if (env.NODE_ENV !== "production") return [];
  return [...secretProblems(env), ...corsProblems(env), ...databaseProblems(env), ...railProblems(env)];
}

/** Settings that are unsafe but cannot stop the service yet, because stopping it would lose access to stored data. Names only. */
export function productionConfigWarnings(env: NodeJS.ProcessEnv = process.env): ConfigProblem[] {
  if (env.NODE_ENV !== "production") return [];
  return env.LOCAL_DEV_DATA_KEY === KNOWN_DEV_DATA_KEY
    ? [
        {
          variable: "LOCAL_DEV_DATA_KEY",
          reason: "is the public development key; stored personal data must be re-encrypted under a new key",
        },
      ]
    : [];
}

/** Throws one error naming every unsafe production setting. Called before the application is created. */
export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  const problems = productionConfigProblems(env);
  if (problems.length === 0) return;
  const lines = problems.map((p) => `${p.variable} ${p.reason}`);
  throw new Error(`Refusing to start in production:\n${lines.join("\n")}`);
}
