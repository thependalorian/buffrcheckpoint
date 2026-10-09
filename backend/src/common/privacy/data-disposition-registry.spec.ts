import { DATA_DISPOSITION_REGISTRY } from "./data-disposition-registry";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// DL-6: a table with personal-looking columns that is not in the registry fails the build, so a new service cannot ship without saying
// what happens to the person's data.
const schemaDir = join(__dirname, "..", "..", "db", "schema");
const PERSONAL =
  /(email|phone|mobile|full_name|first_name|last_name|legal_name|address|envelope|encrypted|subject_reference|recipient|contact_name|id_number|passport|photo|signatory|comment|body|message|notes|ip_address|user_agent|error_message)/i;

function tablesWithPersonalColumns(): string[] {
  const found: string[] = [];
  for (const file of readdirSync(schemaDir).filter((f) => f.endsWith(".ts"))) {
    const text = readFileSync(join(schemaDir, file), "utf8");
    for (const match of text.matchAll(/export const \w+ = pgTable\(\s*"(\w+)",\s*\{([\s\S]*?)\n {2}\},\n/g)) {
      const columns = [...match[2].matchAll(/\w+: \w+\("([a-z_0-9]+)"/g)].map((m) => m[1]);
      if (columns.some((c) => PERSONAL.test(c))) found.push(match[1]);
    }
  }
  return found;
}

describe("data disposition registry (DL-6)", () => {
  const registered = new Set(DATA_DISPOSITION_REGISTRY.map((e) => e.table));

  it("lists every table that has personal-looking columns", () => {
    expect(tablesWithPersonalColumns().filter((t) => !registered.has(t))).toEqual([]);
  });

  it("names only tables that exist, once each", () => {
    const schemaTables = new Set<string>();
    for (const file of readdirSync(schemaDir).filter((f) => f.endsWith(".ts"))) {
      for (const m of readFileSync(join(schemaDir, file), "utf8").matchAll(/pgTable\(\s*"(\w+)"/g))
        schemaTables.add(m[1]);
    }
    expect(DATA_DISPOSITION_REGISTRY.filter((e) => !schemaTables.has(e.table)).map((e) => e.table)).toEqual([]);
    expect(registered.size).toBe(DATA_DISPOSITION_REGISTRY.length);
  });

  it("gives every entry an owner, an identifier and evidence", () => {
    for (const entry of DATA_DISPOSITION_REGISTRY) {
      expect(entry.owner.length).toBeGreaterThan(0);
      expect(entry.identifier.length).toBeGreaterThan(0);
      expect(entry.evidence.length).toBeGreaterThan(10);
    }
  });
});
