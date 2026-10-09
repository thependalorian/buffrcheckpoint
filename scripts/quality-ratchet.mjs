#!/usr/bin/env node
// Quality ratchet (standard WR-24, DOC-1, DC-9, KS-3). Hard rules fail at once; counts that exist today may fall but never rise.
//   copy modules (lib/copy/*.ts in website, admin, ops-console): em dash, semicolon and emoji in a user-facing string must be zero;
//   banned words are counted against a baseline that falls as copy is rewritten.
//   exported functions and classes in backend/src without a comment above them, TODO or FIXME markers, source files over 400 lines.
// Usage: node scripts/quality-ratchet.mjs            (check against scripts/quality-baseline.json)
//        node scripts/quality-ratchet.mjs --write    (lower the baseline after an improvement)
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = join(root, "scripts", "quality-baseline.json");
const EM_DASH = "—";
const EMOJI = /[\u{1F300}-\u{1FAFF}☀-➿⭐✅❌]/gu;
const BANNED = /\b(can|may|just|that|very|really|literally|actually|certainly|probably|basically|could|maybe|delve|embark|craft|imagine|realm|unlock|discover|utilize|hence|furthermore|however|harness|exciting|powerful|moreover|boost|landscape|navigating)\b/gi;

function walk(dir, keep) {
  try {
    statSync(dir);
  } catch {
    return [];
  }
  return readdirSync(dir).flatMap((entry) => {
    if (entry === "node_modules" || entry === ".next" || entry === "dist") return [];
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full, keep) : keep(full) ? [full] : [];
  });
}

const copyFiles = ["website", "admin", "ops-console"].flatMap((app) =>
  walk(join(root, app, "src", "lib", "copy"), (f) => f.endsWith(".ts") && !f.endsWith(".test.ts")),
);
const metrics = { copyEmDash: 0, copySemicolon: 0, copyEmoji: 0, copyBannedWords: 0, undocumentedExports: 0, todoMarkers: 0, filesOver400Lines: 0 };

for (const file of copyFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    const s = match[1] ?? match[2] ?? "";
    if (s.length < 20 || !s.includes(" ")) continue;
    metrics.copyEmDash += s.split(EM_DASH).length - 1;
    metrics.copySemicolon += s.split(";").length - 1;
    metrics.copyEmoji += (s.match(EMOJI) ?? []).length;
    metrics.copyBannedWords += (s.match(BANNED) ?? []).length;
  }
}

const backendFiles = walk(join(root, "backend", "src"), (f) => f.endsWith(".ts") && !f.endsWith(".spec.ts"));
for (const file of backendFiles) {
  const lines = readFileSync(file, "utf8").split("\n");
  if (file.endsWith(".module.ts") || file.includes(`${join("src", "db", "schema")}`)) continue;
  lines.forEach((line, i) => {
    if (!/^export (async )?(function|class|const \w+ = (async )?\()/.test(line)) return;
    let j = i - 1;
    while (j >= 0 && lines[j].trim().startsWith("@")) j--;
    const above = j >= 0 ? lines[j].trim() : "";
    if (!(above.endsWith("*/") || above.startsWith("//"))) metrics.undocumentedExports++;
  });
}

const sourceFiles = ["backend", "website", "admin", "ops-console"].flatMap((app) =>
  walk(join(root, app, "src"), (f) => /\.(ts|tsx)$/.test(f) && !/\.(spec|test)\.tsx?$/.test(f)),
);
for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  metrics.todoMarkers += (text.match(/\b(TODO|FIXME)\b/g) ?? []).length;
  if (text.split("\n").length > 400) metrics.filesOver400Lines++;
}

if (process.argv.includes("--write")) {
  writeFileSync(baselinePath, `${JSON.stringify(metrics, null, 1)}\n`);
  process.stdout.write(`${JSON.stringify(metrics)}\n`);
  process.exit(0);
}
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const hard = ["copyEmDash", "copySemicolon", "copyEmoji"];
const failures = Object.entries(metrics).filter(([k, v]) => (hard.includes(k) ? v > 0 : v > baseline[k]));
process.stdout.write(`${JSON.stringify(metrics)}\n`);
if (failures.length > 0) {
  process.stderr.write(`quality ratchet failed: ${failures.map(([k, v]) => `${k}=${v} (baseline ${hard.includes(k) ? 0 : baseline[k]})`).join(", ")}\n`);
  process.exit(1);
}
