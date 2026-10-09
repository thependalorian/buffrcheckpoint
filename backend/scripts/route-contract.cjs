#!/usr/bin/env node
// API-13: the route contract. Lists every HTTP route with its method, path and access class (public, signed-in only, or a named
// permission) from the compiled controllers, and compares it with docs/api-route-contract.json (the committed contract).
// A route added, removed or re-classified without updating the contract fails CI, so review sees every API change.
// Usage: node scripts/route-contract.cjs          (check)    |    node scripts/route-contract.cjs --write   (update the contract)
require("reflect-metadata");
const { readdirSync, readFileSync, statSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/route_contract";
const dist = join(__dirname, "..", "dist", "src");
const { RequestMethod } = require("@nestjs/common");
const { METHOD_METADATA, PATH_METADATA } = require("@nestjs/common/constants");
const { IS_PUBLIC_KEY } = require(join(dist, "common", "decorators", "public.decorator.js"));
const { AUTHENTICATED_ONLY_KEY } = require(join(dist, "common", "decorators", "authenticated-only.decorator.js"));
const { PERMISSION_KEY } = require(join(dist, "common", "decorators", "require-permission.decorator.js"));

function controllerFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return controllerFiles(full);
    return entry.endsWith(".controller.js") ? [full] : [];
  });
}

const read = (key, handler, controller) => Reflect.getMetadata(key, handler) ?? Reflect.getMetadata(key, controller);
const routes = [];
for (const file of controllerFiles(join(dist, "modules"))) {
  for (const value of Object.values(require(file))) {
    if (typeof value !== "function" || Reflect.getMetadata(PATH_METADATA, value) === undefined) continue;
    const base = String(Reflect.getMetadata(PATH_METADATA, value) ?? "");
    for (const name of Object.getOwnPropertyNames(value.prototype)) {
      const handler = value.prototype[name];
      if (typeof handler !== "function") continue;
      const method = Reflect.getMetadata(METHOD_METADATA, handler);
      if (method === undefined) continue;
      const path = `/${base}/${String(Reflect.getMetadata(PATH_METADATA, handler) ?? "")}`.replace(/\/+/g, "/").replace(/(.)\/$/, "$1");
      const permission = read(PERMISSION_KEY, handler, value);
      const access = read(IS_PUBLIC_KEY, handler, value)
        ? "public"
        : read(AUTHENTICATED_ONLY_KEY, handler, value)
          ? "signed-in"
          : permission
            ? `permission:${Array.isArray(permission) ? permission.join("|") : permission}`
            : "default";
      routes.push(`${RequestMethod[method]} ${path} ${access}`);
    }
  }
}
routes.sort();

const contractPath = join(__dirname, "..", "..", "docs", "api-route-contract.json");
const current = JSON.stringify({ routes }, null, 1) + "\n";
if (process.argv.includes("--write")) {
  writeFileSync(contractPath, current);
  process.stdout.write(`routes=${routes.length} written\n`);
  process.exit(0);
}
let committed = "";
try {
  committed = readFileSync(contractPath, "utf8");
} catch {}
if (committed !== current) {
  const before = new Set(committed ? JSON.parse(committed).routes : []);
  const now = new Set(routes);
  for (const r of routes) if (!before.has(r)) process.stderr.write(`added or changed: ${r}\n`);
  for (const r of before) if (!now.has(r)) process.stderr.write(`removed or changed: ${r}\n`);
  process.stderr.write("route contract differs from docs/api-route-contract.json: review, then run with --write\n");
  process.exit(1);
}
process.stdout.write(`routes=${routes.length} match the contract\n`);
