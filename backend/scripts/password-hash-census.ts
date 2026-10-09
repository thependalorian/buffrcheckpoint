#!/usr/bin/env npx ts-node
/**
 * Counts active accounts by password-hash algorithm (PW-1). Read-only: it selects the hash prefix only and prints counts,
 * never a hash. Legacy bcrypt rows are replaced with Argon2id at each account's next successful sign-in; when the bcrypt
 * count reaches zero, the bcryptjs dependency can be removed.
 *
 * Usage: DATABASE_URL=... npx ts-node --transpile-only scripts/password-hash-census.ts
 */
import "dotenv/config";

import { isNull } from "drizzle-orm";

import { passwordHashAlgorithm } from "../src/common/auth/password-hasher";
import { db } from "../src/db/client";
import { applicationUsers } from "../src/db/schema";

async function main(): Promise<void> {
  const rows = await db
    .select({ hash: applicationUsers.passwordHash })
    .from(applicationUsers)
    .where(isNull(applicationUsers.deletedAt));
  const counts: Record<string, number> = { argon2id: 0, bcrypt: 0, unknown: 0, no_password: 0 };
  for (const { hash } of rows) {
    if (!hash) counts.no_password++;
    else counts[passwordHashAlgorithm(hash)]++;
  }
  console.log(JSON.stringify({ activeAccounts: rows.length, ...counts }));
}

void main();
