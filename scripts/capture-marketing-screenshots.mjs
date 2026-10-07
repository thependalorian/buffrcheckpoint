/**
 * Capture Home page product screenshots from a running admin app (§11.6.5.9).
 *
 *   ADMIN_URL=http://localhost:3000 \
 *   API_BASE=http://localhost:3001 \
 *   DEMO_EMAIL=kiosk-demo@buffrcheckpoint.test \
 *   DEMO_PASSWORD=<test account password> \
 *   node scripts/capture-marketing-screenshots.mjs
 *
 * Optional when the demo user has MFA enabled:
 *   MFA_RECOVERY_CODE=...  or  MFA_TOTP_CODE=...
 */
import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const { authenticator } = require("../backend/node_modules/otplib");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../website/public/screenshots");

const ADMIN_URL = (process.env.ADMIN_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API_BASE = (process.env.API_BASE ?? "http://localhost:3001").replace(/\/$/, "");
// No default credentials: the demo sign-ins were removed. Use a test account in a non-production environment.
const EMAIL = process.env.DEMO_EMAIL;
const PASSWORD = process.env.DEMO_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD");
const MFA_RECOVERY_CODE = process.env.MFA_RECOVERY_CODE?.trim();
const MFA_TOTP_CODE = process.env.MFA_TOTP_CODE?.trim();

const SESSION_COOKIE = "bc_session";
/** Buffr Analytics — canonical demo org (buffrcheckpoint.md §11.6.5.9). */
const DEMO_ORG_ID = "b51f0704-12a7-45d4-8b0d-3642785b6e77";
const ONBOARDING_STEPS_LIVE = [
  "organisation_profile",
  "site_hierarchy",
  "hosts_departments",
  "visitor_categories",
  "check_in_channels",
  "risk_identity_approval",
  "notices_retention",
  "devices_mdm",
  "cran_evidence",
  "flow_tests",
  "role_training",
  "golive_approval",
];

const TARGETS = [
  {
    file: "front-desk.png",
    path: "/dashboard/front-desk",
    selector: '[data-slot="sidebar-inset"]',
  },
  {
    file: "device-compliance.png",
    path: "/dashboard/devices/compliance",
    selector: '[data-slot="sidebar-inset"]',
  },
  {
    file: "compliance-dashboard.png",
    path: "/dashboard/compliance",
    selector: '[data-slot="sidebar-inset"]',
  },
];

async function apiJson(pathname, init = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* raw */
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${pathname} → ${res.status}: ${String(text).slice(0, 400)}`);
  }
  return body;
}

async function completeMfaEnrollment(bearerToken) {
  const start = await apiJson("/auth/mfa/enroll/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!start.secret) {
    throw new Error("MFA enroll/start did not return secret");
  }
  const code = authenticator.generate(start.secret);
  const confirmed = await apiJson("/auth/mfa/enroll/confirm", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearerToken}` },
    body: JSON.stringify({ code }),
  });
  if (!confirmed.accessToken) {
    throw new Error("MFA enroll/confirm did not return accessToken");
  }
  return confirmed.accessToken;
}

async function obtainAccessToken() {
  const login = await apiJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (login.mfaRequired && login.mfaChallengeToken) {
    const challengeToken = login.mfaChallengeToken;
    const body = MFA_RECOVERY_CODE
      ? { challengeToken, recoveryCode: MFA_RECOVERY_CODE }
      : MFA_TOTP_CODE
        ? { challengeToken, code: MFA_TOTP_CODE }
        : null;

    if (!body) {
      throw new Error(
        "Demo user requires MFA at login. Set MFA_RECOVERY_CODE or MFA_TOTP_CODE, or set mfa_enabled=false locally and re-run (script will re-enroll).",
      );
    }

    const verified = await apiJson("/auth/mfa/challenge", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!verified.accessToken) {
      throw new Error("MFA challenge did not return accessToken");
    }
    return verified.accessToken;
  }

  if (!login.accessToken) {
    throw new Error("Login did not return accessToken or MFA challenge");
  }

  if (!login.mfaEnabled) {
    return completeMfaEnrollment(login.accessToken);
  }

  return login.accessToken;
}

function adminHost() {
  const u = new URL(ADMIN_URL);
  return u.hostname;
}

async function readDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }
  try {
    const envPath = path.join(__dirname, "../backend/.env");
    const text = await readFile(envPath, "utf8");
    const match = text.match(/^DATABASE_URL=(.+)$/m);
    if (!match) return null;
    return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    return null;
  }
}

/** MFA confirm resets onboarding locally; marketing captures need the live demo tenant. */
async function ensureDemoOrgLiveForCapture() {
  const connectionString = await readDatabaseUrl();
  if (!connectionString) {
    console.warn("Skipping demo org live reset (no DATABASE_URL). Front-desk may redirect if onboarding is incomplete.");
    return;
  }
  const { neon } = require("../backend/node_modules/@neondatabase/serverless");
  const sql = neon(connectionString);
  const liveRows = await sql`
    SELECT id FROM type_definition
    WHERE domain = 'organisation_onboarding_status' AND code = 'live'
  `;
  const stepRows = await sql`
    SELECT id FROM type_definition
    WHERE domain = 'onboarding_step_code' AND code = 'golive_approval'
  `;
  const liveId = liveRows[0]?.id;
  const stepId = stepRows[0]?.id;
  if (!liveId || !stepId) {
    throw new Error("Could not resolve onboarding type_definition rows");
  }
  await sql`
    UPDATE organisation_onboarding_states
    SET status_code = ${liveId},
        current_step_code = ${stepId},
        completed_step_codes = ${JSON.stringify(ONBOARDING_STEPS_LIVE)}::jsonb,
        golive_approved_at = COALESCE(golive_approved_at, NOW())
    WHERE organisation_id = ${DEMO_ORG_ID} AND deleted_at IS NULL
  `;
  console.log("Demo org onboarding set to live for capture.");
}

async function dismissCookieBanner(page) {
  const accept = page.getByRole("button", { name: /accept analytics/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const accessToken = await obtainAccessToken();
  await ensureDemoOrgLiveForCapture();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: accessToken,
      domain: adminHost(),
      path: "/",
      httpOnly: true,
      secure: ADMIN_URL.startsWith("https"),
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  try {
    await page.goto(`${ADMIN_URL}/dashboard/overview`, { waitUntil: "networkidle" });
    if (page.url().includes("/auth/")) {
      throw new Error(`Session cookie rejected — still on ${page.url()}`);
    }
    await dismissCookieBanner(page);

    for (const target of TARGETS) {
      await page.goto(`${ADMIN_URL}${target.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const root = page.locator(target.selector).first();
      await root.waitFor({ state: "visible", timeout: 30_000 });
      await root.screenshot({
        path: path.join(OUT_DIR, target.file),
        type: "png",
      });
      console.log(`Wrote ${target.file}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
