import { ALL_PICTURE_FILES, picturesFor, TEMPLATE_CATALOG } from "./template-catalog";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(__dirname, "..", "..");
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") && !full.endsWith(".spec.ts") ? [full] : [];
  });
}
const source = sourceFiles(SRC)
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
const sourceOutsideCatalog = sourceFiles(SRC)
  .filter((f) => !f.endsWith("template-catalog.ts"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
const seed = [
  "0038_branded_notification_templates.sql",
  "0059_scheduled_report_email_templates.sql",
  "0061_visitor_and_credit_note_email_templates.sql",
  "0069_customer_breach_notice_template.sql",
  "0071_kyb_pipeline.sql",
  "0073_account_deletion_notice_template.sql",
]
  .map((file) => readFileSync(join(SRC, "..", "db", "migrations", file), "utf8"))
  .join("\n");

// Every migration that writes a template row, oldest first, so later ones overwrite earlier ones.
const templateSeed = readdirSync(join(SRC, "..", "db", "migrations"))
  .filter((file) => file.endsWith(".sql"))
  .map((file) => ({ file, sql: readFileSync(join(SRC, "..", "db", "migrations", file), "utf8") }))
  .filter(({ sql }) => sql.includes("platform_notification_template"))
  .map(({ sql }) => sql)
  .join("\n");

/** Variables a send call passes: the keys of its `variables: { ... }` object, shorthand included. */
function variablesNear(marker: string): Set<string> {
  const keys = new Set<string>();
  for (let at = source.indexOf(marker); at !== -1; at = source.indexOf(marker, at + 1)) {
    const window = source.slice(at, at + 1200);
    const open = window.indexOf("variables:");
    if (open === -1) continue;
    const start = window.indexOf("{", open + "variables:".length);
    if (start === -1) continue;
    // Brace matching, not a non-greedy regex: values like `${adminBase}/auth/...` contain a closing brace of their own.
    let depth = 1;
    let end = start + 1;
    while (end < window.length && depth > 0) {
      if (window[end] === "{") depth++;
      else if (window[end] === "}") depth--;
      end++;
    }
    if (depth !== 0) continue;
    for (const entry of window.slice(start + 1, end - 1).split(",")) {
      const value = entry.trim();
      const shorthand = /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
      const named = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(value);
      if (named) keys.add(named[1]);
      else if (shorthand) keys.add(value);
    }
  }
  return keys;
}

describe("email template catalog", () => {
  it("describes every code that the source sends", () => {
    const used = new Set([...source.matchAll(/templateCode:\s*"([a-z_]+)"/g)].map((m) => m[1]));
    const missing = [...used].filter((code) => !(code in TEMPLATE_CATALOG));
    expect(missing).toEqual([]);
  });

  it("marks a code wired exactly when the source sends it", () => {
    const used = new Set(Object.keys(TEMPLATE_CATALOG).filter((code) => sourceOutsideCatalog.includes(`"${code}"`)));
    // Scheduled reports build their code from the report code ("scheduled_" + code).
    const wiredButUnused = Object.entries(TEMPLATE_CATALOG)
      .filter(([code, spec]) => spec.wired && !code.startsWith("scheduled_") && !used.has(code))
      .map(([code]) => code);
    const usedButUnwired = [...used].filter((code) => TEMPLATE_CATALOG[code] && !TEMPLATE_CATALOG[code].wired);
    expect({ wiredButUnused, usedButUnwired }).toEqual({ wiredButUnused: [], usedButUnwired: [] });
  });

  it("only offers an action label on mail that carries a link, and every spec says what triggers it", () => {
    for (const [code, spec] of Object.entries(TEMPLATE_CATALOG)) {
      expect(spec.trigger.length).toBeGreaterThan(10);
      if (spec.actionLabel) expect(spec.actionLabel.length).toBeLessThanOrEqual(30);
      expect(code).toMatch(/^[a-z_]+$/);
    }
  });

  it("is seeded: every code the seed migration creates is described here", () => {
    const seeded = [...seed.matchAll(/\('notification_template_code', '([a-z_]+)'/g)].map((m) => m[1]);
    expect(seeded.length).toBeGreaterThan(20);
    expect(seeded.filter((code) => !(code in TEMPLATE_CATALOG))).toEqual([]);
  });

  it("gives every customer-facing email a hero picture, and ops mail none", () => {
    for (const [code, spec] of Object.entries(TEMPLATE_CATALOG)) {
      const pictures = picturesFor(code);
      if (spec.category === "ops_internal") expect({ code, pictures }).toEqual({ code, pictures: null });
      else expect({ code, hero: !!pictures?.hero }).toEqual({ code, hero: true });
    }
  });

  it("only names pictures that exist in the website's email folder", () => {
    expect(ALL_PICTURE_FILES.length).toBeGreaterThan(3);
    for (const file of ALL_PICTURE_FILES) {
      expect({
        file,
        exists: existsSync(join(__dirname, "..", "..", "..", "..", "website", "public", "email", file)),
      }).toEqual({ file, exists: true });
    }
  });

  it("has a seeded, editable template row for every catalogued code", () => {
    const seeded = new Set([...seed.matchAll(/\('notification_template_code', '([a-z_]+)'/g)].map((m) => m[1]));
    // support_access_request, password_reset and platform_staff_invitation were seeded earlier (0029 and 0035).
    const earlier = new Set(["support_access_request", "password_reset", "platform_staff_invitation"]);
    const missing = Object.keys(TEMPLATE_CATALOG).filter((code) => !seeded.has(code) && !earlier.has(code));
    expect(missing).toEqual([]);
  });

  it("passes every {{token}} the seeded template asks for", () => {
    // Tokens per code, latest migration wins — a template whose subject says {{period}} but whose caller passes only
    // {{date}} went out reading "Buffr Checkpoint daily summary, {{period}}".
    const tokensByCode = new Map<string, Set<string>>();
    for (const match of templateSeed.matchAll(/\(\s*'([a-z_]+)',\s*([\s\S]*?)\n\s*\)/g)) {
      const code = match[1];
      if (!(code in TEMPLATE_CATALOG)) continue;
      const tokens = new Set([...match[2].matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]));
      if (tokens.size > 0) tokensByCode.set(code, tokens);
    }
    expect(tokensByCode.size).toBeGreaterThan(15);

    const missing: Record<string, string[]> = {};
    for (const [code, tokens] of tokensByCode) {
      // Scheduled reports build their code from the report code, everything else names it literally.
      const marker = code.startsWith("scheduled_") ? "templateCode: `scheduled_" : `templateCode: "${code}"`;
      const passed = variablesNear(marker);
      if (passed.size === 0) continue; // dormant: nothing in the source sends it yet
      const gap = [...tokens].filter((token) => !passed.has(token)).sort();
      if (gap.length > 0) missing[code] = gap;
    }
    expect(missing).toEqual({});
  });

  it("gives the ops daily summary the {{period}} its template asks for", () => {
    // That send call builds `scheduled_${code}` dynamically, so the check above cannot match its marker to a seeded code.
    const start = source.indexOf("private async sendOpsSummary");
    const end = source.indexOf("private async opsOrganisationId");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source.slice(start, end)).toMatch(/variables:\s*\{[^}]*\bperiod:/);
  });
});
