import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Static scan for queries on tenant tables whose next lines never mention the organisation column (AZ-5).
 * A heuristic, not a proof: a primary-key lookup after a scoped fetch, or a platform-wide ops query, is flagged too, so the result
 * is compared with a per-file baseline that can only fall. A new unscoped query in a file raises its count and fails the test.
 */
const WINDOW_LINES = 14;

export function tenantTableExports(schemaDir: string): string[] {
  const names: string[] = [];
  for (const entry of readdirSync(schemaDir)) {
    if (!entry.endsWith(".ts")) continue;
    const text = readFileSync(join(schemaDir, entry), "utf8");
    for (const match of text.matchAll(/export const (\w+) = pgTable\(\s*"\w+"/g)) {
      const start = match.index ?? 0;
      const next = text.indexOf("export const", start + match[0].length);
      const block = text.slice(start, next > 0 ? next : text.length);
      if (block.includes('"organisation_id"')) names.push(match[1]);
    }
  }
  return names;
}

/** Counts queries in one source text that touch a tenant table without naming the organisation column nearby. */
export function countUnscopedQueries(source: string, tenantTables: string[]): number {
  const lines = source.split("\n");
  const pattern = new RegExp(
    `\\.from\\((${tenantTables.join("|")})\\)|query\\.(${tenantTables.join("|")})\\.find|\\.update\\((${tenantTables.join("|")})\\)|\\.delete\\((${tenantTables.join("|")})\\)`,
  );
  let unscoped = 0;
  lines.forEach((line, index) => {
    if (!pattern.test(line)) return;
    const window = lines.slice(index, index + WINDOW_LINES).join("\n");
    if (!/organisationId|organisation_id/.test(window)) unscoped++;
  });
  return unscoped;
}

export function serviceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return serviceFiles(full);
    return entry.endsWith(".service.ts") ? [full] : [];
  });
}
