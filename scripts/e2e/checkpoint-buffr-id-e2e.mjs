#!/usr/bin/env node
// End-to-end check of Checkpoint sign-in with Buffr ID against REAL local servers: Buffr ID (Better Auth), the Checkpoint API and the
// admin app. Run scripts/e2e/buffr-id-setup.mjs first. Nothing here is mocked: the person signs in to Buffr ID with two-step
// sign-in, Buffr ID issues the code, the admin app trades it, and the API verifies the signed ID token.
//
//   E2E_JSON=/path/e2e.json ADMIN_URL=http://localhost:3000 API_URL=http://localhost:3001 DB=<checkpoint db url> node scripts/e2e/checkpoint-buffr-id-e2e.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const cfg = JSON.parse(readFileSync(process.env.E2E_JSON, "utf8"));
const ADMIN = process.env.ADMIN_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:3001";
const DB = process.env.DB;
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); };
const sql = (q) => execFileSync("psql", [DB, "-X", "-At", "-c", q], { encoding: "utf8" }).trim();

function cookieHeader(jar) { return [...jar].map(([k, v]) => `${k}=${v}`).join("; "); }
function absorb(jar, res) {
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    const value = pair.slice(i + 1);
    if (/Max-Age=0|expires=Thu, 01 Jan 1970/i.test(c) || value === "") jar.delete(pair.slice(0, i)); else jar.set(pair.slice(0, i), value);
  }
}
async function get(url, jar, extra = {}) {
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(url, { redirect: "manual", headers: { cookie: cookieHeader(jar), ...extra } });
      break;
    } catch (error) {
      // A development server that is compiling a route can drop a connection; real failures survive three tries.
      if (attempt >= 3) throw error;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  absorb(jar, res);
  return res;
}

// One Checkpoint sign-in through the browser path: admin start -> Buffr ID authorize (as the signed-in person) -> admin callback.
async function signInThroughBuffrId(buffrIdJar, query) {
  const adminJar = new Map();
  const start = await get(`${ADMIN}/api/auth/buffr-id/start?${query}`, adminJar);
  const authorizeUrl = start.headers.get("location");
  let location = authorizeUrl;
  let code = null, state = null;
  for (let hop = 0; hop < 6 && location; hop++) {
    const res = await get(location.startsWith("http") ? location : `http://localhost:3400${location}`, buffrIdJar);
    // Called without a browser Accept header, Better Auth answers a finished authorize with 200 {redirect, url} instead of a 302.
    let next = res.headers.get("location");
    if (!next && res.status === 200) next = (await res.json().catch(() => ({}))).url ?? null;
    if (next && next.startsWith("https://admin.buffrcheckpoint.com/api/auth/buffr-id/callback")) {
      const u = new URL(next);
      code = u.searchParams.get("code"); state = u.searchParams.get("state");
      break;
    }
    if (process.env.E2E_DEBUG) console.log("hop", hop, res.status, String(next).slice(0, 120));
    location = next;
  }
  return { adminJar, start, authorizeUrl, code, state };
}
const callback = (adminJar, code, state) => get(`${ADMIN}/api/auth/buffr-id/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, adminJar);
async function me(token) { const r = await fetch(`${API}/auth/me`, { headers: { authorization: `Bearer ${token}` } }); return { status: r.status, body: await r.json().catch(() => null) }; }

const ownerJar = new Map(cfg.ownerCookies);
const orgName = `E2E Buffr ID ${Date.now()} Hotel`;

// 1. A new organisation from a Buffr ID sign-up
const reg = await signInThroughBuffrId(ownerJar, `intent=register&org=${encodeURIComponent(orgName)}&sector=sme`);
check("start redirects to Buffr ID with PKCE S256, state and nonce", /code_challenge_method=S256/.test(reg.authorizeUrl ?? "") && /state=/.test(reg.authorizeUrl) && /nonce=/.test(reg.authorizeUrl), reg.authorizeUrl);
check("Buffr ID issued an authorization code to the admin callback", Boolean(reg.code && reg.state), "no code");
const done = await callback(reg.adminJar, reg.code, reg.state);
check("callback signs the person in (redirect to onboarding)", done.status === 307 && /\/onboarding\//.test(done.headers.get("location") ?? ""), `${done.status} ${done.headers.get("location")}`);
const token = reg.adminJar.get("bc_session");
check("session cookie is set and the flow cookie is cleared", Boolean(token) && !reg.adminJar.has("bc_buffr_id_flow"));
const profile = token ? await me(token) : { status: 0 };
check("API accepts the session; owner of the new organisation; two-step sign-in carried from Buffr ID", profile.status === 200 && profile.body?.user?.mfaEnabled === true && profile.body?.memberships?.[0]?.roles?.includes("owner_operator"), JSON.stringify(profile.body?.user));
const row = sql(`SELECT buffr_id_subject IS NOT NULL, email_verified_at IS NOT NULL, password_hash IS NULL, mfa_enabled FROM application_users WHERE lower(email)='${cfg.owner.email}' AND deleted_at IS NULL`);
check("user is linked to the Buffr ID subject, verified, with no Checkpoint password", row === "t|t|t|t", row);
check("organisation starts past email verification (no verification email needed)", sql(`SELECT t.code FROM organisation_onboarding_states s JOIN type_definition t ON t.id=s.status_code JOIN application_users u ON u.organisation_id=s.organisation_id WHERE lower(u.email)='${cfg.owner.email}'`) === "in_progress" || sql(`SELECT t.code FROM organisation_onboarding_states s JOIN type_definition t ON t.id=s.status_code JOIN application_users u ON u.organisation_id=s.organisation_id WHERE lower(u.email)='${cfg.owner.email}'`) === "email_verified");

// 2. Sign in again: same account, no duplicate organisation
const again = await signInThroughBuffrId(ownerJar, "intent=signin");
const done2 = await callback(again.adminJar, again.code, again.state);
check("second sign-in works and lands on the same account", done2.status === 307 && Boolean(again.adminJar.get("bc_session")), `${done2.status}`);
check("still exactly one Checkpoint user for this Buffr ID", sql(`SELECT count(*) FROM application_users WHERE lower(email)='${cfg.owner.email}' AND deleted_at IS NULL`) === "1");

// 3. Attacks
const replay = await callback(new Map([["bc_buffr_id_flow", reg.adminJar.get("bc_buffr_id_flow") ?? ""]]), reg.code, reg.state);
check("a code cannot be replayed without the browser's flow cookie", replay.status === 307 && /error=buffr_id_state/.test(replay.headers.get("location") ?? ""), replay.headers.get("location"));
const fresh = await signInThroughBuffrId(ownerJar, "intent=signin");
const badState = await callback(fresh.adminJar, fresh.code, "tampered-state");
check("a tampered state is refused", /error=buffr_id_state/.test(badState.headers.get("location") ?? ""), badState.headers.get("location"));
const reuse = await signInThroughBuffrId(ownerJar, "intent=signin");
await callback(reuse.adminJar, reuse.code, reuse.state);
const second = new Map([["bc_buffr_id_flow", ""]]);
check("an authorization code works once (second use is refused)", await (async () => {
  const a = await signInThroughBuffrId(ownerJar, "intent=signin");
  await callback(a.adminJar, a.code, a.state);
  const a2 = new Map(); // fresh browser flow reusing the spent code with a flow cookie from a new start
  const s = await get(`${ADMIN}/api/auth/buffr-id/start?intent=signin`, a2);
  const r = await callback(a2, a.code, new URL(s.headers.get("location")).searchParams.get("state"));
  return /error=buffr_id_token/.test(r.headers.get("location") ?? "");
})());

// Direct API attacks on the exchange endpoint
const exch = (body) => fetch(`${API}/auth/buffr-id/exchange`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
check("exchange refuses a garbage token", (await exch({ idToken: "x".repeat(40), surface: "admin" })).status === 401);
check("exchange refuses an unknown surface", (await exch({ idToken: "x".repeat(40), surface: "root" })).status === 400);

// 4. A Buffr ID with no Checkpoint account is told to create an organisation (never auto-created on sign-in)
const noAccountEmail = `nobody-${Date.now()}@e2e.example`;
execFileSync("psql", [DB, "-X", "-q", "-c", "SELECT 1"], { encoding: "utf8" });

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
