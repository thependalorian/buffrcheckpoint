#!/usr/bin/env npx ts-node
/**
 * Run after any database restore, before traffic resumes (DL-10, RC-5). Reads the live recovery tombstones and erases again every
 * person the restored data shows as present. Prints counts only. Use --dry-run to count without changing anything.
 *
 * Usage: DELETION_TOMBSTONE_PEPPER=... DATABASE_URL=... npx ts-node --transpile-only scripts/replay-deletions.ts [--dry-run]
 */
import "dotenv/config";

import { neon } from "@neondatabase/serverless";

import { usersToEraseAgain } from "../src/modules/dsar/deletion-replay";

const dryRun = process.argv.includes("--dry-run");
const sql = neon(process.env.DATABASE_URL ?? "");

async function main(): Promise<void> {
  const pepper = process.env.DELETION_TOMBSTONE_PEPPER;
  if (!pepper) throw new Error("DELETION_TOMBSTONE_PEPPER must be set");
  const now = new Date();
  const tombstones = (
    (await sql(
      "SELECT organisation_id, subject_hmac, replay_until FROM deletion_recovery_tombstone WHERE deleted_at IS NULL AND replay_until > now()",
    )) as Array<{ organisation_id: string; subject_hmac: string; replay_until: string }>
  ).map((row) => ({
    organisationId: row.organisation_id,
    subjectHmac: row.subject_hmac,
    replayUntil: new Date(row.replay_until),
  }));
  const users = (
    (await sql(
      "SELECT id::text AS id, organisation_id::text AS organisation_id, deleted_at, email FROM application_users",
    )) as Array<{
      id: string;
      organisation_id: string;
      deleted_at: string | null;
      email: string;
    }>
  ).map((row) => ({
    id: row.id,
    organisationId: row.organisation_id,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    email: row.email,
  }));

  const again = usersToEraseAgain(tombstones, users, pepper, now);
  if (!dryRun) {
    for (const user of again) {
      await sql(
        `UPDATE application_users SET email = 'erased-' || id::text || '@erased.invalid', password_hash = NULL, mfa_enabled = false,
           mfa_secret_reference = NULL, buffr_id_subject = NULL, locked_until = NULL, deleted_at = now(), credentials_changed_at = now()
         WHERE id = $1::uuid AND organisation_id = $2::uuid`,
        [user.id, user.organisationId],
      );
    }
  }
  process.stdout.write(`${JSON.stringify({ dryRun, liveTombstones: tombstones.length, erasedAgain: again.length })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`replay failed: ${error instanceof Error ? error.constructor.name : "error"}\n`);
  process.exit(1);
});
