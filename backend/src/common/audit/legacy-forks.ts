import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "../../db/client";
import { typeDefinition } from "../../db/schema";

/** The type_definition domain listing audit events that start a known fork from before the 2026-10-07 unique index. */
export const LEGACY_FORK_DOMAIN = "audit_chain_legacy_fork";

/**
 * Loads the registered legacy fork heads. Each row's code is an audit event id and its label states why it is accepted. History is
 * never rewritten, so the fork stays in the log and the evidence pack; registering it stops a fork that cannot be undone from raising
 * a break every day, while the verifier keeps checking every hash on both branches and refuses any new fork.
 */
export async function loadLegacyForkHeads(db: Database): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ code: typeDefinition.code })
    .from(typeDefinition)
    .where(and(eq(typeDefinition.domain, LEGACY_FORK_DOMAIN), isNull(typeDefinition.deletedAt)));
  return new Set(rows.map((r) => r.code));
}
