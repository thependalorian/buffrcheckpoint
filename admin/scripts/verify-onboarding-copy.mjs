// Fails when admin onboarding copy drifts from the backend checklist:
// every evidence key needs blocker copy, and step order must match.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(resolve(here, path), "utf8");

const evidenceSource = read("../../backend/src/modules/auth/onboarding-evidence.service.ts");
const stepsSource = read("../../backend/src/modules/onboarding/onboarding-steps.ts");
const copySource = read("../src/lib/copy/onboarding.ts");

const evidenceKeys = [...evidenceSource.matchAll(/need\([^,]+,\s*"([^"]+)"\)/g)].map((match) => match[1]);
assert.ok(evidenceKeys.length > 0, "no evidence keys found in onboarding-evidence.service.ts");

const blockerBlock = copySource.slice(copySource.indexOf("blockerCopy: {"));
const blockerKeys = new Set([...blockerBlock.matchAll(/^\s+"([a-z_]+\.[a-z_]+)":/gm)].map((match) => match[1]));
const missingCopy = evidenceKeys.filter((key) => !blockerKeys.has(key));
assert.deepEqual(missingCopy, [], `blockerCopy missing for: ${missingCopy.join(", ")}`);

const stepsBlock = stepsSource.slice(stepsSource.indexOf("ONBOARDING_STEPS = ["), stepsSource.indexOf("] as const"));
const backendSteps = [...stepsBlock.matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);

const slugBlock = copySource.slice(copySource.indexOf("STEP_SLUG_TO_CODE: Record"));
const adminSteps = [...slugBlock.slice(0, slugBlock.indexOf("};")).matchAll(/:\s*"([a-z_]+)"/g)].map(
  (match) => match[1],
);
assert.deepEqual(adminSteps, backendSteps, "STEP_SLUG_TO_CODE order differs from backend ONBOARDING_STEPS");

for (const step of backendSteps) {
  assert.ok(new RegExp(`^\\s{4}${step}: \\{`, "m").test(copySource), `steps copy missing for ${step}`);
}

console.log(`onboarding copy checks passed (${backendSteps.length} steps, ${evidenceKeys.length} evidence keys)`);
