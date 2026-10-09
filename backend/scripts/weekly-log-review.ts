#!/usr/bin/env npx ts-node
/**
 * Prepares the weekly log review record (LG-5): reads the last seven days of audit action codes across all organisations, counts them
 * by group, lists any alert action, and prints the record. The reviewer reads the output and the alerts, then files the printed
 * JSON as a workflow_run in workspace-ops (workflow type log_review). Prints counts and action codes only, never event payloads.
 *
 * Usage: DATABASE_URL=... npx ts-node --transpile-only scripts/weekly-log-review.ts --reviewer "Name"
 */
import "dotenv/config";

import { neon } from "@neondatabase/serverless";

import { buildLogReview } from "../src/common/audit/log-review";

async function main(): Promise<void> {
  const at = process.argv.indexOf("--reviewer");
  const reviewer = at > -1 ? (process.argv[at + 1] ?? "") : "";
  const sql = neon(process.env.DATABASE_URL ?? "");
  const rows = (await sql(
    "SELECT action_code FROM audit_events WHERE occurred_at >= now() - interval '7 days'",
  )) as Array<{
    action_code: string;
  }>;
  const record = buildLogReview(
    rows.map((r) => r.action_code),
    reviewer,
    new Date(),
  );
  process.stdout.write(`${JSON.stringify(record)}\n`);
  process.exit(record.outcome === "clear" ? 0 : 1);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
});
