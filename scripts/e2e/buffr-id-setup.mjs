#!/usr/bin/env node
// Prepares a local Buffr ID for the Checkpoint end-to-end test: creates an operator and a person with two-step sign-in, registers the
// Checkpoint admin and ops clients, and writes what the test needs to a JSON file (never committed; it holds a client secret).
//
//   BUFFR_ID_URL=http://localhost:3400 BUFFR_ID_DB=postgresql://... OUT=/path/e2e.json node scripts/e2e/buffr-id-setup.mjs
//
// This is a test harness for a LOCAL Buffr ID. Marking an email verified by SQL stands in for clicking the mail link.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../../backend/package.json", import.meta.url));
const { authenticator } = require("otplib");

const BASE = process.env.BUFFR_ID_URL ?? "http://localhost:3400";
const DB = process.env.BUFFR_ID_DB;
const OUT = process.env.OUT;
const PASSWORD = "correct horse battery staple 42";
if (!DB || !OUT) throw new Error("Set BUFFR_ID_DB and OUT");

class Browser {
  jar = new Map();
  async call(method, path, body) {
    const headers = { origin: BASE, "content-type": "application/json", "user-agent": "e2e", "x-forwarded-for": "198.51.100.9" };
    if (this.jar.size) headers.cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(path.startsWith("http") ? path : `${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
}

const sql = (q) => execFileSync("psql", [DB, "-X", "-q", "-c", q], { encoding: "utf8" });

async function makePerson(email, name) {
  const b = new Browser();
  let r = await b.call("POST", "/api/auth/sign-up/email", { email, password: PASSWORD, name });
  if (r.status >= 300) throw new Error(`sign-up ${email}: ${r.status} ${r.text}`);
  sql(`UPDATE "user" SET "emailVerified" = true WHERE email = '${email}'`);
  r = await b.call("POST", "/api/auth/sign-in/email", { email, password: PASSWORD });
  if (r.status !== 200) throw new Error(`sign-in ${email}: ${r.status} ${r.text}`);
  r = await b.call("POST", "/api/auth/two-factor/enable", { password: PASSWORD });
  if (r.status !== 200) throw new Error(`2fa enable: ${r.status} ${r.text}`);
  const secret = new URL(r.json.totpURI).searchParams.get("secret");
  r = await b.call("POST", "/api/auth/two-factor/verify-totp", { code: authenticator.generate(secret) });
  if (r.status !== 200) throw new Error(`2fa verify: ${r.status} ${r.text}`);
  return { browser: b, secret };
}

sql(`TRUNCATE "user" CASCADE`); // a clean slate for every run
const op = await makePerson("operator@e2e.example", "Operator");
const registered = {};
for (const surface of ["admin", "ops"]) {
  const r = await op.browser.call("POST", "/api/admin/clients", {
    client_name: `Checkpoint ${surface} (e2e)`,
    // Better Auth wants https for web clients. The test never browses to it: it carries the code to the local admin app itself.
    redirect_uris: [`https://${surface}.buffrcheckpoint.com/api/auth/buffr-id/callback`],
  });
  if (r.status !== 201) throw new Error(`register ${surface}: ${r.status} ${r.text}`);
  registered[surface] = { clientId: r.json.client_id, clientSecret: r.json.client_secret };
}
const runId = Date.now();
const owner = { email: `owner-${runId}@e2e.example`, secret: null };
const person = await makePerson(owner.email, "Org Owner");
owner.secret = person.secret;

writeFileSync(OUT, JSON.stringify({ base: BASE, password: PASSWORD, owner, clients: registered, ownerCookies: [...person.browser.jar] }, null, 2), { mode: 0o600 });
console.log("setup ok:", { owner: owner.email, clients: Object.keys(registered) });
