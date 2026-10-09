#!/usr/bin/env node
// CI-6: zero failures, zero skips, and a test count that cannot fall. Reads a Jest or Vitest JSON report and compares it with
// scripts/test-floor.json. Raise the floor in the same change that adds tests; lowering it is a reviewed, stated decision.
// Usage: node scripts/test-floor.mjs <app> <report.json>
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [app, reportPath] = process.argv.slice(2);
const floors = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "test-floor.json"), "utf8"));
const report = JSON.parse(readFileSync(reportPath, "utf8"));
const { numTotalTests: total, numFailedTests: failed, numPendingTests: skipped, numTodoTests: todo = 0 } = report;
const floor = floors[app];

const problems = [];
if (floor === undefined) problems.push(`no floor recorded for ${app}`);
if (failed > 0) problems.push(`${failed} failing`);
if (skipped + todo > 0) problems.push(`${skipped + todo} skipped or todo`);
if (floor !== undefined && total < floor) problems.push(`${total} tests, floor is ${floor}`);

process.stdout.write(`${app}: total=${total} failed=${failed} skipped=${skipped + todo} floor=${floor}\n`);
if (problems.length > 0) {
  process.stderr.write(`test floor not met: ${problems.join("; ")}\n`);
  process.exit(1);
}
