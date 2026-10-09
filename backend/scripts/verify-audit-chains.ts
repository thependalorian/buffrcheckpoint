#!/usr/bin/env npx ts-node
/**
 * Read-only chain check (LG-2): verifies every organisation's audit chain with the registered legacy forks and prints counts and the
 * first broken event id per organisation. Writes nothing, so it is safe against production.
 *
 * Usage: DATABASE_URL=... npx ts-node --transpile-only scripts/verify-audit-chains.ts
 */
import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { verifyChain } from "../src/common/audit/audit-chain";
import { loadLegacyForkHeads } from "../src/common/audit/legacy-forks";
import * as schema from "../src/db/schema";

async function main(): Promise<void> {
  const db = drizzle(neon(process.env.DATABASE_URL ?? ""), { schema });
  const forks = await loadLegacyForkHeads(db as never);
  const orgs = await db.selectDistinct({ id: schema.auditEvents.organisationId }).from(schema.auditEvents);
  const breaks: Array<{ organisationId: string; brokenAtEventId: string | null }> = [];
  let events = 0;
  for (const { id } of orgs) {
    const rows = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.organisationId, id) });
    events += rows.length;
    const result = verifyChain(rows, forks);
    if (!result.valid) breaks.push({ organisationId: id, brokenAtEventId: result.brokenAtEventId });
  }
  process.stdout.write(
    `${JSON.stringify({ organisations: orgs.length, events, registeredLegacyForks: forks.size, breaks })}\n`,
  );
  process.exit(breaks.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
});
