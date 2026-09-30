// Render every NN_*.html in this folder to pdf/<same name>.pdf on A4, honouring @page.
// Usage (from this folder): node render_pdfs.mjs
// Uses the Playwright copy installed in ../../website and a local Chromium browser.
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../website/package.json"));
const { chromium } = require("playwright");

const candidates = [
  process.env.CHROMIUM_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) throw new Error("No Chromium browser found. Set CHROMIUM_PATH.");

const files = readdirSync(here).filter((f) => /^\d\d_.*\.html$/.test(f)).sort();
const browser = await chromium.launch({ executablePath });
for (const file of files) {
  const page = await browser.newPage();
  await page.goto(`file://${path.join(here, file)}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const broken = await page.evaluate(() =>
    [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute("src")),
  );
  const out = path.join(here, "pdf", file.replace(/\.html$/, ".pdf"));
  await page.pdf({ path: out, format: "A4", preferCSSPageSize: true, printBackground: true });
  console.log(`${file} -> pdf/${path.basename(out)}${broken.length ? `  BROKEN IMAGES: ${broken.join(", ")}` : ""}`);
  await page.close();
}
await browser.close();
