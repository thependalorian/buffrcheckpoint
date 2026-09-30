#!/usr/bin/env npx ts-node
/**
 * Verifies the separate ops front door (buffrcheckpoint.md §9.2a) over HTTP.
 *
 * Usage (against a Neon branch, never production data you care about: it enrols MFA
 * on the ops account if missing):
 *   API_BASE=http://localhost:3099 OPS_EMAIL=... OPS_PASSWORD=... [OPS_TOTP_SECRET=...] \
 *     CUSTOMER_EMAIL=... CUSTOMER_PASSWORD=... npx ts-node scripts/ops-auth-verify.ts
 *
 * Prints PASS/FAIL per rule and, when it enrols MFA, the new TOTP secret on the last line
 * as OPS_TOTP_SECRET=... so the caller can store it. Exits 1 on any failure.
 */
import "dotenv/config";
import { authenticator } from "otplib";
import * as jwt from "jsonwebtoken";

const API = (process.env.API_BASE ?? "http://localhost:3001").replace(/\/$/, "");
let failures = 0;

function check(name: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

async function call(path: string, init: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

function audOf(token: unknown): unknown {
  return typeof token === "string" ? (jwt.decode(token) as { aud?: string } | null)?.aud : undefined;
}

async function main() {
  const opsEmail = process.env.OPS_EMAIL ?? "";
  const opsPassword = process.env.OPS_PASSWORD ?? "";
  let totpSecret = process.env.OPS_TOTP_SECRET;

  // Rule 5: staff cannot use the customer front door.
  const staffOnCustomer = await call("/auth/login", { method: "POST", body: { email: opsEmail, password: opsPassword } });
  check("customer login refuses staff", staffOnCustomer.status === 401, `${staffOnCustomer.status} ${staffOnCustomer.json.message}`);

  // Rule 1: customers cannot use the ops front door (same error as a wrong password).
  if (process.env.CUSTOMER_EMAIL) {
    const custOnOps = await call("/auth/platform/login", {
      method: "POST",
      body: { email: process.env.CUSTOMER_EMAIL, password: process.env.CUSTOMER_PASSWORD },
    });
    check("ops login refuses customers", custOnOps.status === 401 && custOnOps.json.message === "Invalid email or password", `${custOnOps.status} ${custOnOps.json.message}`);
    const custNormal = await call("/auth/login", {
      method: "POST",
      body: { email: process.env.CUSTOMER_EMAIL, password: process.env.CUSTOMER_PASSWORD },
    });
    check("customer login still works for customers", custNormal.status === 200, `${custNormal.status} keys ${Object.keys(custNormal.json).join(",")}`);
  }

  // Rule 2: MFA is mandatory for staff.
  let login = await call("/auth/platform/login", { method: "POST", body: { email: opsEmail, password: opsPassword } });
  let opsToken: string | undefined;
  if (login.json.mfaEnrollmentRequired) {
    const enrollToken = login.json.enrollmentToken as string;
    check("enrolment token audience", audOf(enrollToken) === "ops_enroll", String(audOf(enrollToken)));
    const blocked = await call("/platform/billing/catalog", { token: enrollToken });
    check("enrolment token cannot use ops routes", blocked.status === 403, `${blocked.status} ${blocked.json.message}`);
    const start = await call("/auth/mfa/enroll/start", { method: "POST", token: enrollToken });
    totpSecret = start.json.secret as string;
    check("enrolment start", start.status === 201 || start.status === 200, `${start.status}`);
    const confirm = await call("/auth/mfa/enroll/confirm", {
      method: "POST",
      token: enrollToken,
      body: { code: authenticator.generate(totpSecret) },
    });
    opsToken = confirm.json.accessToken as string;
    check("enrolment confirm issues ops session", audOf(opsToken) === "ops" && Array.isArray(confirm.json.recoveryCodes), `aud ${audOf(opsToken)}, ${(confirm.json.recoveryCodes as unknown[])?.length} recovery codes`);
    login = await call("/auth/platform/login", { method: "POST", body: { email: opsEmail, password: opsPassword } });
  }
  check("staff login now requires MFA", login.json.mfaRequired === true, `keys ${Object.keys(login.json).join(",")}`);

  if (login.json.mfaChallengeToken && totpSecret) {
    // A staff challenge cannot be completed at the customer verify endpoint.
    const wrongDoor = await call("/auth/mfa/challenge/verify", {
      method: "POST",
      body: { challengeToken: login.json.mfaChallengeToken, code: authenticator.generate(totpSecret) },
    });
    check("customer MFA verify refuses staff", wrongDoor.status === 401, `${wrongDoor.status} ${wrongDoor.json.message}`);
    const again = await call("/auth/platform/login", { method: "POST", body: { email: opsEmail, password: opsPassword } });
    const verified = await call("/auth/platform/mfa/challenge/verify", {
      method: "POST",
      body: { challengeToken: again.json.mfaChallengeToken, code: authenticator.generate(totpSecret) },
    });
    opsToken = verified.json.accessToken as string;
    check("ops MFA verify issues ops session", audOf(opsToken) === "ops", String(audOf(opsToken)));
  }

  if (opsToken) {
    // Rule 4: shorter ops sessions.
    const claims = jwt.decode(opsToken) as { exp: number; iat: number };
    check("ops session lasts 2h", claims.exp - claims.iat === 7200, `${claims.exp - claims.iat}s`);
    // Rule 3: ops tokens only on the ops surface.
    const opsRoute = await call("/platform/billing/catalog", { token: opsToken });
    check("ops token on ops route", opsRoute.status === 200, `${opsRoute.status}`);
    const customerRoute = await call("/sites", { token: opsToken });
    check("ops token refused on customer route", customerRoute.status === 403, `${customerRoute.status} ${customerRoute.json.message}`);
  }

  // Rule 3, other direction: a customer-audience token never exercises platform permissions.
  if (process.env.JWT_SECRET) {
    const forged = jwt.sign(
      { sub: "00000000-0000-0000-0000-000000000000", organisationId: "00000000-0000-0000-0000-000000000000", siteId: null, roleCode: "platform_support", permissions: ["platform.billing.manage"], emailVerified: true, mfaEnabled: true, aud: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" },
    );
    const res = await call("/platform/billing/catalog", { token: forged });
    check("admin token refused on platform permission", res.status === 403, `${res.status} ${res.json.message}`);
  }

  if (totpSecret && !process.env.OPS_TOTP_SECRET) console.log(`OPS_TOTP_SECRET=${totpSecret}`);
  if (failures) {
    console.log(`${failures} check(s) failed`);
    process.exit(1);
  }
}

void main();
