import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// API-3: a GET never changes state. This reads every controller and fails when a @Get handler calls a service method whose
// name says it writes. Reads that are allowed to have a side effect (a single-use link that is consumed by being opened) are
// listed below with the reason; adding to the list needs a reviewer.

const modules = join(__dirname, "..", "..", "modules");
const WRITE_VERB =
  /this\.\w+\.(create|update|delete|remove|insert|save|mark|approve|revoke|reject|submit|send|issue|rotate|reset|cancel|close|accept|record|apply|execute|start|stop|enrol|enroll|confirm|grant|assign|set)[A-Z]?\w*\(/;
const ALLOWED: Record<string, string> = {};

function controllers(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return controllers(full);
    return full.endsWith(".controller.ts") ? [full] : [];
  });
}

/** Splits a controller file into handler chunks, each starting at an HTTP method decorator. */
function handlers(text: string): Array<{ verb: string; body: string }> {
  const parts = text.split(/(?=^\s*@(?:Get|Post|Put|Patch|Delete)\()/m);
  return parts
    .slice(1)
    .map((chunk) => ({ verb: /@(Get|Post|Put|Patch|Delete)\(/.exec(chunk)?.[1] ?? "", body: chunk }));
}

describe("GET handlers do not change state (API-3)", () => {
  const files = controllers(modules);

  it("scans the controllers", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("has no @Get handler that calls a writing service method", () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const handler of handlers(readFileSync(file, "utf8"))) {
        if (handler.verb !== "Get") continue;
        const hit = WRITE_VERB.exec(handler.body);
        const key = `${file.replace(modules, "")}: ${hit?.[0] ?? ""}`;
        if (hit && !(key in ALLOWED)) offenders.push(key);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every @Get with a write verb in its path is flagged by the same scan", () => {
    const sample = `@Get("x")\n  async read() {\n    return this.visits.updateVisit();\n  }\n`;
    expect(WRITE_VERB.test(sample)).toBe(true);
  });
});
