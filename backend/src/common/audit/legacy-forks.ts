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

/** The type_definition domain mapping an organisation to an id it had before a merge: code is the current id, label the former id. */
export const FORMER_ORG_DOMAIN = "audit_chain_former_org_id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loads, per current organisation id, the former ids its older audit events were hashed under. The 2026-09 organisation merge changed
 * organisation_id on existing rows, and the hash covers it. An event still has to match one of these ids exactly, so a registered alias
 * cannot hide an edited event.
 */
export async function loadFormerOrganisationIds(db: Database): Promise<ReadonlyMap<string, readonly string[]>> {
  const rows = await db
    .select({ code: typeDefinition.code, label: typeDefinition.label })
    .from(typeDefinition)
    .where(and(eq(typeDefinition.domain, FORMER_ORG_DOMAIN), isNull(typeDefinition.deletedAt)));
  const map = new Map<string, string[]>();
  for (const { code, label } of rows) {
    if (!UUID.test(code) || !UUID.test(label)) continue;
    map.set(code, [...(map.get(code) ?? []), label]);
  }
  return map;
}
