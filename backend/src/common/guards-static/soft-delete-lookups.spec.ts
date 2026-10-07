import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Regression guard for the bug fixed on 2026-10-02 in credential validation:
// a lookup by a business key (reference, code, token, email, serial, HMAC,
// number) on a soft-deletable table must exclude deleted rows, or a deleted
// row can shadow a live one with the same key. New lookups that need deleted
// rows must be added to ALLOWED with the reason.

const ALLOWED: Record<string, string> = {
  // Reinstates a deactivated staff account instead of creating a duplicate.
  "platform-staff/platform-staff.service.ts:applicationUsers": "reinstate deactivated account",
  // The (organisation_id, email) unique index is not partial, so a
  // deactivated email is still taken; registration reports the conflict.
  "auth/auth.service.ts:applicationUsers": "email unique across deleted rows",
  // idx_invoice_number is not partial: a deleted invoice still holds its number. SMS usage billing looks the number up first so that a
  // month is never billed twice, and must see a deleted invoice too or the insert would collide.
  "billing/billing.service.ts:invoice": "invoice number unique across deleted rows",
};

const KEY = /(Reference|Code$|code$|Token|token|Email|email|Serial|serial|Hmac|hmac|Number$|Key$|slug)/;
const root = join(__dirname, "..", "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return path.endsWith(".ts") && !path.endsWith(".spec.ts") ? [path] : [];
  });
}

function softDeletableTables(): Set<string> {
  const tables = new Set<string>();
  for (const file of files(join(root, "db", "schema"))) {
    const src = readFileSync(file, "utf8");
    for (const match of src.matchAll(/export const (\w+) = pgTable\(([\s\S]*?)\n\);?\n/g)) {
      if (match[2].includes("deletedAt")) tables.add(match[1]);
    }
  }
  return tables;
}

function block(src: string, start: number): string {
  let depth = 1;
  let i = start;
  while (depth > 0 && i < src.length) {
    if (src[i] === "{") depth += 1;
    if (src[i] === "}") depth -= 1;
    i += 1;
  }
  return src.slice(start, i);
}

describe("soft-delete safe lookups", () => {
  it("every business-key findFirst on a soft-deletable table excludes deleted rows", () => {
    const tables = softDeletableTables();
    expect(tables.size).toBeGreaterThan(20);
    const offenders: string[] = [];
    for (const file of files(join(root, "modules"))) {
      const src = readFileSync(file, "utf8");
      for (const match of src.matchAll(/\.query\.(\w+)\.findFirst\(\{/g)) {
        const table = match[1];
        if (!tables.has(table)) continue;
        const where = block(src, (match.index ?? 0) + match[0].length);
        if (where.includes("deletedAt")) continue;
        const keys = [...where.matchAll(/eq\(\s*\w+\.(\w+)/g)].map((m) => m[1]);
        const businessKeys = keys.filter((k) => KEY.test(k) && !k.endsWith("Id") && k !== "statusCode");
        if (businessKeys.length === 0) continue;
        const id = `${relative(join(root, "modules"), file)}:${table}`;
        if (!ALLOWED[id]) offenders.push(`${id} (${businessKeys.join(", ")})`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
