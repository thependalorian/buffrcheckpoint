#!/usr/bin/env npx ts-node
/**
 * Re-encrypts every personal-data envelope that is still on an older key under the current key (EN-2). Safe to repeat: an envelope
 * already on the current key is skipped. It finds the envelope columns itself (every jsonb column of the public schema that holds
 * rows with an `encryptionAlgorithm` key), updates one row at a time by primary key, and prints counts only, never a value.
 *
 * Usage: PERSONAL_DATA_KEY=... [LOCAL_DEV_DATA_KEY=...] DATABASE_URL=... npx ts-node --transpile-only scripts/rotate-personal-data-key.ts [--dry-run]
 * Rehearse on a branch first. When it reports zero remaining on an older key, remove LOCAL_DEV_DATA_KEY from the platform secrets.
 */
import "dotenv/config";

import { neon } from "@neondatabase/serverless";

import {
  PersonalDataProtectionService,
  type ProtectedPersonalDataEnvelope,
} from "../src/common/data-protection/personal-data-protection.service";

const dryRun = process.argv.includes("--dry-run");
const sql = neon(process.env.DATABASE_URL ?? "");
const protection = new PersonalDataProtectionService();

function quote(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) throw new Error("unexpected identifier");
  return `"${identifier}"`;
}

async function main(): Promise<void> {
  if (!process.env.PERSONAL_DATA_KEY) throw new Error("PERSONAL_DATA_KEY must be set: nothing to rotate to");
  const columns = (await sql(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'jsonb' ORDER BY 1, 2",
  )) as Array<{ table_name: string; column_name: string }>;
  const report: Array<{ column: string; found: number; rotated: number; unreadable: number; remaining: number }> = [];
  for (const { table_name: table, column_name: column } of columns) {
    const rows = (await sql(
      `SELECT id::text AS id, ${quote(column)} AS value FROM ${quote(table)} WHERE jsonb_typeof(${quote(column)}) = 'object' AND ${quote(column)} ? 'encryptionAlgorithm'`,
    ).catch(() => [])) as Array<{ id: string; value: ProtectedPersonalDataEnvelope }>;
    if (rows.length === 0) continue;
    let rotated = 0;
    let unreadable = 0;
    for (const row of rows) {
      if (!protection.needsRotation(row.value)) continue;
      if (!dryRun) {
        let next: ProtectedPersonalDataEnvelope;
        try {
          next = protection.rotateEnvelope(row.value);
        } catch {
          // Written under a key this environment does not hold: counted, left as it is, and reported so the owner can find its key.
          unreadable++;
          continue;
        }
        // The original is part of the condition, so a row changed meanwhile is left alone and picked up by the next run.
        await sql(
          `UPDATE ${quote(table)} SET ${quote(column)} = $1::jsonb WHERE id = $2::uuid AND ${quote(column)} = $3::jsonb`,
          [JSON.stringify(next), row.id, JSON.stringify(row.value)],
        );
      }
      rotated++;
    }
    report.push({
      column: `${table}.${column}`,
      found: rows.length,
      rotated,
      unreadable,
      remaining: dryRun ? rotated : unreadable,
    });
  }
  const remaining = report.reduce((n, r) => n + r.remaining, 0);
  process.stdout.write(`${JSON.stringify({ dryRun, columns: report, remainingOnOlderKey: remaining })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`rotation failed: ${error instanceof Error ? error.constructor.name : "error"}\n`);
  process.exit(1);
});
