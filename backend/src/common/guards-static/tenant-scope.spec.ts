import baseline from "./tenant-scope-baseline.json";
import { countUnscopedQueries, serviceFiles, tenantTableExports } from "./tenant-scope-scan";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const modulesDir = join(__dirname, "..", "..", "modules");
const tables = tenantTableExports(join(__dirname, "..", "..", "db", "schema"));
const allowed = baseline as Record<string, number>;

describe("tenant scope scan (AZ-5)", () => {
  it("knows the tenant tables", () => {
    expect(tables.length).toBeGreaterThan(60);
    expect(tables).toContain("visitorVisits");
  });

  it("flags a query on a tenant table that never names the organisation (mutation check)", () => {
    const unscoped = "const rows = await this.db.select().from(visitorVisits).where(eq(visitorVisits.id, id));";
    const scoped =
      "const rows = await this.db.select().from(visitorVisits).where(and(eq(visitorVisits.organisationId, org), eq(visitorVisits.id, id)));";
    expect(countUnscopedQueries(unscoped, tables)).toBe(1);
    expect(countUnscopedQueries(scoped, tables)).toBe(0);
  });

  it("lets no service file gain an unscoped query beyond the recorded baseline", () => {
    const grew: string[] = [];
    for (const file of serviceFiles(modulesDir)) {
      const relative = file.slice(modulesDir.length + 1);
      const count = countUnscopedQueries(readFileSync(file, "utf8"), tables);
      if (count > (allowed[relative] ?? 0)) grew.push(`${relative}: ${count} > ${allowed[relative] ?? 0}`);
    }
    expect(grew).toEqual([]);
  });
});
