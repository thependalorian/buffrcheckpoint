#!/usr/bin/env node
// Monthly SOC 2 evidence snapshot for Buffr Checkpoint. Read-only. Writes .evidence/YYYY-MM-DD.json (git-ignored) and prints a summary.
//
//   DATABASE_URL=<connection string> node scripts/compliance/collect-evidence.mjs
//
// Each check states what it expects. A failed check is a finding to fix, not a note to file. Personal data is never written:
// only counts, role names and pass/fail.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const results = [];
const check = (id, control, expect, actual, pass) => results.push({ id, control, expect, actual, pass: Boolean(pass) });

const sh = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const psql = (sql) => sh("psql", [process.env.DATABASE_URL, "-X", "-At", "-F", "|", "-c", sql]).trim();
const rows = (sql) => psql(sql).split("\n").filter(Boolean).map((r) => r.split("|"));

// 1. Dependencies (CC7.1)
for (const pkg of ["backend", "admin", "ops-console", "website"]) {
  let counts = null;
  try {
    counts = JSON.parse(sh("npm", ["audit", "--omit=dev", "--json"], join(root, pkg)) ).metadata.vulnerabilities;
  } catch (e) {
    try { counts = JSON.parse(e.stdout ?? "{}").metadata?.vulnerabilities ?? null; } catch { counts = null; }
  }
  check(`deps.${pkg}`, "CC7.1", "no high or critical vulnerabilities", counts, counts && counts.high === 0 && counts.critical === 0);
}

// 2. Change management (CC8.1)
const head = sh("git", ["rev-parse", "HEAD"]).trim();
const dirty = sh("git", ["status", "--porcelain"]).trim().split("\n").filter(Boolean).length;
check("change.clean_tree", "CC8.1", "deployed code equals a commit (0 uncommitted files)", { head, uncommitted_files: dirty }, dirty === 0);

if (process.env.DATABASE_URL) {
  // 3. Access (CC6.1, CC6.2)
  const [[noMfa]] = rows(`SELECT count(*) FROM application_users u JOIN organisations o ON o.id=u.organisation_id
    JOIN organisation_onboarding_states s ON s.organisation_id=o.id AND s.deleted_at IS NULL
    JOIN type_definition t ON t.id=s.status_code AND t.code='live'
    WHERE u.deleted_at IS NULL AND o.deleted_at IS NULL AND u.password_hash IS NOT NULL AND u.mfa_enabled = false`);
  check("access.mfa_live", "CC6.1", "0 active users without MFA in live organisations", Number(noMfa), Number(noMfa) === 0);

  const [[demo]] = rows(`SELECT count(*) FROM application_users WHERE deleted_at IS NULL AND password_hash IS NOT NULL AND email ~* '@buffrcheckpoint\\.test$'`);
  check("access.demo_signins", "CC6.1", "0 active demo sign-ins", Number(demo), Number(demo) === 0);

  const [[testOrgs]] = rows(`SELECT count(*) FROM organisations WHERE legal_name ~* '(e2e|smoke|journey|canonical|demo)' OR legal_name ~* '^test '`);
  check("data.test_orgs", "CC6.1", "0 test or demo organisations in production", Number(testOrgs), Number(testOrgs) === 0);

  const [[unverified]] = rows(`SELECT count(*) FROM application_users WHERE deleted_at IS NULL AND email_verified_at IS NULL`);
  check("access.unverified_users", "CC6.2", "informational: accounts that never verified an email (review for abuse)", Number(unverified), true);

  // 4. Least privilege (CC6.1): the runtime role exists and cannot rewrite append-only tables
  const [[role]] = rows(`SELECT count(*) FROM pg_roles WHERE rolname='buffr_checkpoint_runtime' AND rolcanlogin AND NOT rolsuper`);
  check("db.runtime_role", "CC6.1", "least-privilege runtime role exists", Number(role), Number(role) === 1);
  if (Number(role) === 1) {
    const [[rewrite]] = rows(`SELECT count(*) FROM information_schema.role_table_grants WHERE grantee='buffr_checkpoint_runtime'
      AND table_name IN ('audit_events','organisation_onboarding_status_log') AND privilege_type IN ('UPDATE','DELETE')`);
    check("db.append_only", "CC7.2", "runtime role has no UPDATE or DELETE on audit and status-log tables", Number(rewrite), Number(rewrite) === 0);
  }
  check("db.connecting_role", "CC6.1", "this evidence run used the owner role; confirm the API's DATABASE_URL role in Railway separately", rows("SELECT current_user")[0][0], true);

  // 5. Audit trail integrity (CC7.2): recompute the per-organisation hash chain
  const events = rows(`SELECT organisation_id, actor_id, action_code, resource_type, resource_id, to_char(occurred_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), prev_event_hash, event_hash
    FROM audit_events ORDER BY organisation_id, occurred_at, id`);
  const CUTOFF = "2026-10-07T00:00:00.000Z"; // migration 0057: chains cannot fork from here on
  let legacyBroken = 0, broken = 0, last = new Map();
  for (const [org, actor, action, rtype, rid, at, prev, hash] of events) {
    const expectedPrev = last.get(org) ?? null;
    const payload = JSON.stringify({ organisationId: org, actorId: actor || null, actionCode: action, resourceType: rtype, resourceId: rid || null, occurredAt: at, prevEventHash: prev || null });
    const recomputed = createHash("sha256").update(payload).digest("hex");
    if ((prev || null) !== expectedPrev || recomputed !== hash) { if (at < CUTOFF) legacyBroken += 1; else broken += 1; }
    last.set(org, hash);
  }
  check("audit.chain", "CC7.2", "from 2026-10-07 every audit event links to the previous one and its hash recomputes (earlier history has known breaks: concurrent writes and the 2026-09 organisation merge)", { events: events.length, broken_since_cutoff: broken, known_legacy_breaks: legacyBroken }, broken === 0);
} else {
  check("db.skipped", "CC6.1", "set DATABASE_URL to run the database checks", null, false);
}

const outDir = join(root, ".evidence");
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(file, JSON.stringify({ collected_at: new Date().toISOString(), results }, null, 2));
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id.padEnd(24)} ${r.control}  ${JSON.stringify(r.actual)}`);
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed. Written to ${file}`);
process.exitCode = results.every((r) => r.pass) ? 0 : 1;
