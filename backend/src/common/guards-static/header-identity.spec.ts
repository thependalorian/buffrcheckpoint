import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// AZ-3: identity is never read from a request header. The only identity sources are the verified access token and the Buffr ID token.
// This scans the application source and the example environment files; a build that adds a header-identity path fails here.

const root = join(__dirname, "..", "..", "..");
const IDENTITY_HEADERS =
  /headers\[\s*["'`]x-(user|org|organisation|tenant|actor|role)[^"'`]*["'`]\s*\]|req(uest)?\.headers\.x-(user|org|organisation|tenant|actor|role)|get\(\s*["'`]x-(user|org|organisation|tenant|actor|role)/i;
const TRUST_FLAGS = /TRUST_(HEADER|PROXY_IDENTITY|FORWARDED_USER)|ALLOW_HEADER_(AUTH|IDENTITY)/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return entry.endsWith(".ts") && !entry.endsWith(".spec.ts") ? [full] : [];
  });
}

describe("no header-supplied identity (AZ-3)", () => {
  it("has no code that reads a user, organisation, tenant or role from a request header", () => {
    const offenders = sourceFiles(join(root, "src")).filter((file) =>
      IDENTITY_HEADERS.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("has no trust flag in the example environment or deployment files", () => {
    for (const file of [".env.example", "railway.toml", "railpack.json"]) {
      expect(readFileSync(join(root, file), "utf8")).not.toMatch(TRUST_FLAGS);
    }
  });
});
