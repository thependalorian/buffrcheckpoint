import "dotenv/config";

import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { and, eq, isNull } from "drizzle-orm";
import { authenticator } from "otplib";
import request from "supertest";
import type { App } from "supertest/types";

import { AppModule } from "../src/app.module";
import { generateOpaqueToken, hashOpaqueToken } from "../src/common/crypto/secret-crypto";
import type { Database } from "../src/db/client";
import { DB } from "../src/db/db.module";
import {
  applicationUsers,
  emailVerificationTokens,
  organisations,
  visitorPolicyAcknowledgements,
} from "../src/db/schema";
import { randomUUID } from "node:crypto";

jest.setTimeout(180_000);

/**
 * Emergency information QR, contractor induction QR and device support QR against a disposable Neon branch: publishing the text,
 * issuing the QR, the public pages, the contractor acknowledgement with its rules, and the permission-gated device QR.
 */
describe("Site notices and QR types (e2e)", () => {
  let app: INestApplication<App>;
  let db: Database;
  let token: string;
  let organisationId: string;
  let siteId: string;
  let hostId: string;
  const runId = Date.now();
  const phone = `+26481${String(runId).slice(-7)}`;
  const otherPhone = `+26485${String(runId).slice(-7)}`;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());

  async function issueQr(qrTypeCode: string, label: string) {
    const created = await http()
      .post("/site-qr-references")
      .set(auth())
      .send({ siteId, qrTypeCode, label })
      .expect(201);
    const rotated = await http().post(`/site-qr-references/${created.body.id}/rotate`).set(auth()).send({}).expect(201);
    return { referenceId: rotated.body.reference.id as string, payload: rotated.body.payload as string | null };
  }

  async function checkIn(name: string, visitorPhone: string, visitorTypeCode: string) {
    const id = randomUUID();
    await http()
      .post("/visits/check-in")
      .set(auth())
      .send({
        id,
        siteId,
        hostId,
        visitorName: name,
        visitorPhone,
        visitorTypeCode,
        captureChannelCode: "assisted",
        checkedInAt: new Date().toISOString(),
      })
      .expect(201);
    return id;
  }

  beforeAll(async () => {
    process.env.MFA_SECRET_ENCRYPTION_KEY =
      process.env.MFA_SECRET_ENCRYPTION_KEY ?? "test-mfa-secret-encryption-key-32chars!!";
    process.env.EMAIL_VERIFICATION_PEPPER = process.env.EMAIL_VERIFICATION_PEPPER ?? "test-email-pepper";
    process.env.MFA_CHALLENGE_PEPPER = process.env.MFA_CHALLENGE_PEPPER ?? "test-mfa-challenge-pepper";
    process.env.QR_TOKEN_PEPPER = process.env.QR_TOKEN_PEPPER ?? "test-qr-pepper";
    // The assertions are about public https links; a developer .env points these at localhost, so pin them here.
    process.env.PUBLIC_WEB_BASE_URL = "https://buffrcheckpoint.com";
    process.env.VISITOR_CHECKIN_BASE_URL = "https://buffrcheckpoint.com";
    process.env.PUBLIC_ASSET_BASE_URL = "https://api.buffrcheckpoint.com";
    authenticator.options = { window: 1 };

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = moduleFixture.get(DB);

    const ownerEmail = `e2e-notices-${runId}@example.test`;
    const created = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `E2E Notices ${runId}`,
        sectorCode: "sme",
        email: ownerEmail,
        password: "testpassword123",
      })
      .expect(201);
    organisationId = created.body.organisationId as string;
    const user = await db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, ownerEmail), isNull(applicationUsers.deletedAt)),
    });
    if (!user) throw new Error("owner missing");
    const raw = generateOpaqueToken();
    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      organisationId,
      userId: user.id,
      tokenHash: hashOpaqueToken(raw, "EMAIL_VERIFICATION_PEPPER"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const verified = await request(app.getHttpServer())
      .post("/auth/email-verification/verify")
      .send({ token: raw })
      .expect(200);
    const start = await request(app.getHttpServer())
      .post("/auth/mfa/enroll/start")
      .set("Authorization", `Bearer ${verified.body.accessToken}`)
      .expect(201);
    const confirm = await request(app.getHttpServer())
      .post("/auth/mfa/enroll/confirm")
      .set("Authorization", `Bearer ${verified.body.accessToken}`)
      .send({ code: authenticator.generate(start.body.secret as string) })
      .expect(201);
    token = confirm.body.accessToken as string;

    const site = await request(app.getHttpServer())
      .post("/sites")
      .set(auth())
      .send({ name: "Main reception" })
      .expect(201);
    siteId = site.body.id as string;
    const host = await request(app.getHttpServer())
      .post("/hosts")
      .set(auth())
      .send({ siteId, name: "Safety Desk" })
      .expect(201);
    hostId = host.body.id as string;
  });

  afterAll(async () => {
    if (organisationId)
      await db.update(organisations).set({ deletedAt: new Date() }).where(eq(organisations.id, organisationId));
    await app.close();
  });

  let emergencyRef = "";
  let inductionRef = "";
  let inductionVersion = "";

  it("keeps the notice endpoints behind sign-in and the public pages behind a valid QR", async () => {
    await http().get("/site-notices/emergency").expect(401);
    await http().put("/site-notices/emergency").send({ contentText: "Assemble at the car park." }).expect(401);
    await http().get("/public/emergency-info").query({ site: siteId, ref: randomUUID() }).expect(404);
    await http().get("/public/induction").query({ site: siteId, ref: randomUUID() }).expect(404);
    await http()
      .put("/site-notices/privacy")
      .set(auth())
      .send({ contentText: "Not a real kind of notice." })
      .expect(400);
  });

  it("refuses to issue a QR type that has no public page, and rejects notice text that is too short", async () => {
    await http()
      .post("/site-qr-references")
      .set(auth())
      .send({ siteId, qrTypeCode: "device_support", label: "x" })
      .expect(400);
    await http()
      .post("/site-qr-references")
      .set(auth())
      .send({ siteId, qrTypeCode: "sign_out", label: "x" })
      .expect(400);
    await http().put("/site-notices/emergency").set(auth()).send({ contentText: "too short" }).expect(400);
  });

  it("publishes the emergency information, issues its QR, and serves it to anyone who scans it", async () => {
    const published = await http()
      .put("/site-notices/emergency")
      .set(auth())
      .send({
        siteId,
        contentText: "Assemble at the north car park.\nCall 10111 for the police, 211111 for the ambulance.",
      })
      .expect(200);
    expect(published.body.versionNumber).toBe(1);
    expect(published.body.siteSpecific).toBe(true);

    const qr = await issueQr("emergency_info", "Main reception emergency");
    emergencyRef = qr.referenceId;
    expect(qr.payload).toMatch(/\/emergency\?site=.+&ref=.+/);

    const page = await http().get("/public/emergency-info").query({ site: siteId, ref: emergencyRef }).expect(200);
    expect(page.body).toMatchObject({ available: true, title: "Emergency information", versionNumber: 1 });
    expect(page.body.contentText).toContain("north car park");
    expect(JSON.stringify(page.body)).not.toMatch(/visitor|phone|email/i);
  });

  it("serves a new version after republishing, and an induction QR cannot open the emergency page", async () => {
    await http()
      .put("/site-notices/emergency")
      .set(auth())
      .send({ siteId, contentText: "Updated: assemble at the south gate and wait for a warden." })
      .expect(200);
    const page = await http().get("/public/emergency-info").query({ site: siteId, ref: emergencyRef }).expect(200);
    expect(page.body.versionNumber).toBe(2);
    expect(page.body.contentText).toContain("south gate");

    const induction = await issueQr("contractor_induction", "Contractor induction");
    inductionRef = induction.referenceId;
    expect(induction.payload).toMatch(/\/induction\?site=.+&ref=.+/);
    await http().get("/public/emergency-info").query({ site: siteId, ref: inductionRef }).expect(404);
    await http().get("/public/induction").query({ site: siteId, ref: emergencyRef }).expect(404);
  });

  it("says plainly when no induction has been published yet, and refuses to acknowledge it", async () => {
    const page = await http().get("/public/induction").query({ site: siteId, ref: inductionRef }).expect(200);
    expect(page.body.available).toBe(false);
    await http()
      .post("/public/induction/acknowledge")
      .send({ siteId, referenceId: inductionRef, visitorPhone: phone, policyVersionId: randomUUID() })
      .expect(404);
  });

  it("publishes the induction and lets only a checked-in contractor acknowledge it, once", async () => {
    await http()
      .put("/site-notices/induction")
      .set(auth())
      .send({
        contentText:
          "1. Wear the issued helmet.\n2. Report incidents to the safety desk.\n3. Follow the marked walkways.",
      })
      .expect(200);
    const page = await http().get("/public/induction").query({ site: siteId, ref: inductionRef }).expect(200);
    expect(page.body).toMatchObject({ available: true, versionNumber: 1 });
    inductionVersion = page.body.policyVersionId as string;
    expect(page.body.siteName).toBeTruthy();

    // No visit yet: refused.
    await http()
      .post("/public/induction/acknowledge")
      .send({ siteId, referenceId: inductionRef, visitorPhone: phone, policyVersionId: inductionVersion })
      .expect(400);

    // A general visitor is refused with the reason.
    await checkIn("Visitor General", otherPhone, "general");
    const refused = await http()
      .post("/public/induction/acknowledge")
      .send({ siteId, referenceId: inductionRef, visitorPhone: otherPhone, policyVersionId: inductionVersion })
      .expect(400);
    expect(refused.body.message).toMatch(/for contractors/);

    // The contractor can.
    const visitId = await checkIn("Contractor One", phone, "contractor");
    const before = await http().get(`/site-notices/induction/visits/${visitId}`).set(auth()).expect(200);
    expect(before.body).toMatchObject({ required: true, acknowledged: false });

    const first = await http()
      .post("/public/induction/acknowledge")
      .send({ siteId, referenceId: inductionRef, visitorPhone: phone, policyVersionId: inductionVersion })
      .expect(201);
    expect(first.body).toMatchObject({ acknowledged: true, repeated: false });
    const again = await http()
      .post("/public/induction/acknowledge")
      .send({ siteId, referenceId: inductionRef, visitorPhone: phone, policyVersionId: inductionVersion })
      .expect(201);
    expect(again.body).toMatchObject({ acknowledged: true, repeated: true });

    const rows = await db.query.visitorPolicyAcknowledgements.findMany({
      where: and(eq(visitorPolicyAcknowledgements.visitId, visitId), isNull(visitorPolicyAcknowledgements.deletedAt)),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].acceptedAt).toBeTruthy();

    const after = await http().get(`/site-notices/induction/visits/${visitId}`).set(auth()).expect(200);
    expect(after.body).toMatchObject({ required: true, acknowledged: true });

    // A general visitor's visit does not require it.
    const general = await http()
      .get(
        `/site-notices/induction/visits/${await checkIn("Visitor Two", `+26482${String(runId).slice(-7)}`, "general")}`,
      )
      .set(auth())
      .expect(200);
    expect(general.body).toMatchObject({ required: false, acknowledged: false });
  });

  it("refuses an acknowledgement for text that was replaced while the contractor was reading", async () => {
    await http()
      .put("/site-notices/induction")
      .set(auth())
      .send({ contentText: "Revised induction: wear a helmet and a high-visibility vest at all times." })
      .expect(200);
    const visitPhone = `+26483${String(runId).slice(-7)}`;
    await checkIn("Contractor Two", visitPhone, "contractor");
    const stale = await http()
      .post("/public/induction/acknowledge")
      .send({ siteId, referenceId: inductionRef, visitorPhone: visitPhone, policyVersionId: inductionVersion })
      .expect(409);
    expect(stale.body.message).toMatch(/updated while you were reading/);
    const fresh = await http().get("/public/induction").query({ site: siteId, ref: inductionRef }).expect(200);
    expect(fresh.body.versionNumber).toBe(2);
    await http()
      .post("/public/induction/acknowledge")
      .send({
        siteId,
        referenceId: inductionRef,
        visitorPhone: visitPhone,
        policyVersionId: fresh.body.policyVersionId,
      })
      .expect(201);
  });

  it("gives a registered device a support QR that points at the admin app, for staff only", async () => {
    const device = await http()
      .post("/devices")
      .set(auth())
      .send({ siteId, manufacturer: "Samsung", model: "Tab Active", serialNumber: `SN-${runId}` })
      .expect(201);
    await http().get(`/devices/${device.body.id}/support-qr`).expect(401);
    const qr = await http().get(`/devices/${device.body.id}/support-qr`).set(auth()).expect(200);
    expect(qr.body.payload).toMatch(new RegExp(`/dashboard/devices/${device.body.id}$`));
    expect(qr.body.caption).toContain(`SN-${runId}`);
    expect(JSON.stringify(qr.body)).not.toMatch(/password|secret|token/i);
  });

  it("lists the issued QR codes with the URL to print for each type", async () => {
    const list = await http().get("/site-qr-references").set(auth()).expect(200);
    const types = list.body.map((r: { qrTypeCode: string }) => r.qrTypeCode).sort();
    expect(types).toEqual(expect.arrayContaining(["contractor_induction", "emergency_info"]));
    for (const row of list.body as Array<{ qrTypeCode: string; payload: string | null }>)
      expect(row.payload).toMatch(/^https:\/\//);
  });
});
