#!/usr/bin/env node
// Lists every state-changing route that declares none of @RequirePermission,
// @Public or @AuthenticatedOnly (buffrcheckpoint.md §5.2 rule 9). RbacGuard
// refuses these at runtime; this catches them before deploy.
// Usage: npm run audit:routes   (builds first; exits 1 when any gap exists)
require("reflect-metadata");
const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/route_policy_audit";

const distModules = join(__dirname, "..", "dist", "src", "modules");
const { findRoutePolicyGaps } = require(join(__dirname, "..", "dist", "src", "common", "guards", "route-policy.js"));

function controllerFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return controllerFiles(full);
    return entry.endsWith(".controller.js") ? [full] : [];
  });
}

const gaps = [];
let controllers = 0;
for (const file of controllerFiles(distModules)) {
  for (const value of Object.values(require(file))) {
    if (typeof value === "function" && Reflect.getMetadata("path", value) !== undefined) {
      controllers += 1;
      gaps.push(...findRoutePolicyGaps(value));
    }
  }
}

for (const gap of gaps) {
  process.stdout.write(`${gap.method} ${gap.path} (${gap.controller}.${gap.handler})\n`);
}
process.stdout.write(`controllers=${controllers} mutation_routes_without_policy=${gaps.length}\n`);
if (controllers < 40) {
  process.stderr.write(`expected at least 40 controllers, found ${controllers}\n`);
  process.exit(1);
}
process.exit(gaps.length === 0 ? 0 : 1);
