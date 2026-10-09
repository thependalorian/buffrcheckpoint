#!/usr/bin/env node
// NM-9: identifiers (table names, column names, route paths, environment variables) must not carry a source token (a standard code, a
// document word, a vendor or a ticket) unless the token is on the allow-list in scripts/naming-dictionary.json with its reason.
// Usage: node scripts/naming-scan.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dictionary = JSON.parse(readFileSync(join(root, "scripts", "naming-dictionary.json"), "utf8"));
const allowed = new Set(dictionary.allow.map((entry) => entry.token));
const tokens = dictionary.tokens.map((pattern) => ({ pattern, re: new RegExp(`(^|_|-|/)(${pattern})($|_|-|/)`, "i") }));

const identifiers = [];
const schemaDir = join(root, "backend", "src", "db", "schema");
for (const file of readdirSync(schemaDir).filter((f) => f.endsWith(".ts"))) {
  const text = readFileSync(join(schemaDir, file), "utf8");
  for (const m of text.matchAll(/pgTable\(\s*"(\w+)"/g)) identifiers.push({ kind: "table", name: m[1], file });
  for (const m of text.matchAll(/\w+: \w+\("([a-z_0-9]+)"/g)) identifiers.push({ kind: "column", name: m[1], file });
}
try {
  for (const route of JSON.parse(readFileSync(join(root, "docs", "api-route-contract.json"), "utf8")).routes) {
    identifiers.push({ kind: "route", name: route.split(" ")[1], file: "api-route-contract.json" });
  }
} catch {}
for (const m of (() => {
  try {
    return readFileSync(join(root, "backend", ".env.example"), "utf8");
  } catch {
    return "";
  }
})().matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)) {
  identifiers.push({ kind: "environment variable", name: m[1], file: ".env.example" });
}

const hits = [];
for (const id of identifiers) {
  for (const { pattern, re } of tokens) {
    if (!re.test(id.name)) continue;
    const word = id.name.toLowerCase().match(new RegExp(pattern, "i"))?.[0] ?? pattern;
    if (!allowed.has(word)) hits.push(`${id.kind} ${id.name} (${id.file}) carries source token "${word}"`);
  }
}
const unique = [...new Set(hits)];
process.stdout.write(`identifiers=${identifiers.length} source_name_hits=${unique.length}\n`);
for (const hit of unique) process.stderr.write(`${hit}\n`);
process.exit(unique.length === 0 ? 0 : 1);
