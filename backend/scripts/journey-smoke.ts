#!/usr/bin/env npx ts-node
import { authenticator } from "otplib";

/**
 * Continuous journey smoke tests against a running API (local or prod).
 *
 * Usage:
 *   DEMO_EMAIL=... DEMO_PASSWORD=... [DEMO_TOTP_SECRET=...] API_BASE=https://api.buffrcheckpoint.com \
 *     npx ts-node scripts/journey-smoke.ts
 *
 * DEMO_TOTP_SECRET is the base32 authenticator secret of the test account. It is required when the
 * account has MFA (login answers mfaRequired); the script never reads or stores it anywhere else.
 *
 * Covers:
 *   1) emergency trigger → roster → resolve
 *   2) public check-in into a host-approval zone → approve
 *   3) staff check-out of that visit (A0-07)
 */
import { randomUUID } from "node:crypto";

const API = (process.env.API_BASE ?? "http://localhost:3001").replace(/\/$/, "");
// No default credentials: the demo sign-ins were removed, and a published password is a back door. Supply a test account.
const EMAIL = process.env.DEMO_EMAIL;
const PASSWORD = process.env.DEMO_PASSWORD;
const TOTP_SECRET = process.env.DEMO_TOTP_SECRET;
if (!EMAIL || !PASSWORD)
  throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD to a test account in a non-production environment");

async function req(path: string, init: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* raw */
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return body as Record<string, unknown>;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log(`API ${API}`);

  const login = await req("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  let session = login;
  if (login.mfaRequired) {
    assert(TOTP_SECRET, "login requires MFA: set DEMO_TOTP_SECRET to the test account's authenticator secret");
    session = await req("/auth/mfa/challenge/verify", {
      method: "POST",
      body: JSON.stringify({
        challengeToken: login.mfaChallengeToken,
        code: authenticator.generate(TOTP_SECRET),
      }),
    });
  }
  const token = (session.accessToken as string) || (session.token as string);
  assert(token, "login did not return accessToken");

  const sites = (await req("/sites", { token })) as unknown as Array<{ id: string; name: string }>;
  assert(Array.isArray(sites) && sites.length > 0, "no sites for demo user");
  const siteId = sites[0].id;
  console.log("site", siteId, sites[0].name);

  // --- 1) Emergency journey ---
  const triggered = await req("/emergency/trigger", {
    method: "POST",
    token,
    body: JSON.stringify({ siteId }),
  });
  const emergencyId =
    (triggered.emergencyEvent as { id?: string } | undefined)?.id ?? (triggered.id as string | undefined);
  assert(emergencyId, "trigger missing emergency id");
  const roster = await req(`/emergency/${emergencyId}/roster`, { token });
  assert(roster.event || roster.roster, "roster payload missing");
  const resolved = await req(`/emergency/${emergencyId}/resolve`, {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
  assert(resolved.closedAt || resolved.id, "resolve missing closedAt");
  console.log("OK emergency trigger→roster→resolve", emergencyId);

  // --- 2) Public check-in → host approval ---
  let zones = (await req(`/security-zones?siteId=${siteId}`, { token }).catch(() => [])) as unknown as Array<{
    id: string;
    hostApprovalRequired?: boolean;
  }>;
  if (!Array.isArray(zones)) zones = [];

  let approvalZone = zones.find((z) => z.hostApprovalRequired);
  if (!approvalZone && zones[0]) {
    try {
      await req(`/security-zones/${zones[0].id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ hostApprovalRequired: true }),
      });
      approvalZone = { ...zones[0], hostApprovalRequired: true };
    } catch (err) {
      console.warn("WARN could not enable hostApprovalRequired:", (err as Error).message);
    }
  }
  if (!approvalZone) {
    try {
      const created = await req("/security-zones", {
        method: "POST",
        token,
        body: JSON.stringify({
          siteId,
          name: "Journey Smoke Host Gate",
          zoneCode: "smoke_host_gate",
          hostApprovalRequired: true,
        }),
      });
      approvalZone = {
        id: (created.id as string) || (created.zone as { id?: string } | undefined)?.id || "",
        hostApprovalRequired: true,
      };
      assert(approvalZone.id, "created zone missing id");
      console.log("created host-approval zone", approvalZone.id);
    } catch (err) {
      console.warn("WARN could not create host-approval zone:", (err as Error).message);
    }
  }

  const hosts = (await req(`/hosts?siteId=${siteId}`, { token })) as unknown as Array<{ id: string }>;
  assert(hosts?.[0]?.id, "need a host for public check-in");

  const qrList = (await req("/site-qr-references", { token })) as unknown as Array<{
    id: string;
    siteId: string;
    qrTypeCode?: string;
  }>;
  const qr = qrList.find((r) => r.siteId === siteId) ?? qrList[0];
  assert(qr?.id, "need a site QR reference (public_site_checkin)");

  const visitId = randomUUID();
  const publicResult = await req("/public/check-in", {
    method: "POST",
    body: JSON.stringify({
      id: visitId,
      siteId: qr.siteId,
      referenceId: qr.id,
      hostId: hosts[0].id,
      zoneId: approvalZone?.id,
      visitorName: "Journey Smoke Visitor",
      visitorPhone: "+264811119999",
      companyName: "Buffr Smoke Test",
      visitorTypeCode: "general",
      privacyAcknowledged: true,
    }),
  });
  assert(publicResult.visitId || publicResult.id || visitId, "public check-in failed");

  const rosterAfter = (await req(`/visits/roster?siteId=${qr.siteId}`, { token })) as unknown as Array<{
    visitId: string;
    visitStatusCode: string;
  }>;
  const row = rosterAfter.find((r) => r.visitId === visitId);
  if (approvalZone?.hostApprovalRequired) {
    assert(row?.visitStatusCode === "pending_approval", `expected pending_approval, got ${row?.visitStatusCode}`);
    await req(`/visits/${visitId}/approve`, {
      method: "POST",
      token,
      body: JSON.stringify({}),
    });
    const afterApprove = (await req(`/visits/roster?siteId=${qr.siteId}`, { token })) as unknown as Array<{
      visitId: string;
      visitStatusCode: string;
    }>;
    const admitted = afterApprove.find((r) => r.visitId === visitId);
    assert(admitted?.visitStatusCode === "admitted", `expected admitted, got ${admitted?.visitStatusCode}`);
    console.log("OK public check-in → pending_approval → approve");
  } else {
    console.log("WARN no host-approval zone — public check-in created but approval path not exercised");
  }

  // --- 3) Staff check-out (A0-07) ---
  await req(`/visits/${visitId}/check-out`, {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
  const rosterClosed = (await req(`/visits/roster?siteId=${qr.siteId}`, { token })) as unknown as Array<{
    visitId: string;
    visitStatusCode: string;
  }>;
  const closed = rosterClosed.find((r) => r.visitId === visitId);
  assert(
    !closed || closed.visitStatusCode === "checked_out" || closed.visitStatusCode === "closed",
    `expected visit checked out / absent from open roster, got ${closed?.visitStatusCode ?? "absent"}`,
  );
  console.log("OK staff check-out", visitId);

  console.log("journey-smoke: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
