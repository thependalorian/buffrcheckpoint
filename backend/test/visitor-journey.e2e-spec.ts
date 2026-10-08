import "dotenv/config";

import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { and, desc, eq, isNull } from "drizzle-orm";
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
  notificationDeliveryInstructions,
  organisations,
  visitSurveyResponses,
} from "../src/db/schema";
import { BillingService } from "../src/modules/billing/billing.service";
import { randomUUID } from "node:crypto";

jest.setTimeout(180_000);

/**
 * The visitor journey and the new money path, against a disposable Neon branch: check-in with an email address, the receipt, the
 * personal sign-out link, the thank-you, the rating with an encrypted comment, the staff views and their permission split, the
 * organisation switch, and a credit note. Email transport must be unconfigured here: rows are queued and inspected, never sent.
 */
describe("Visitor journey and credit notes (e2e)", () => {
  let app: INestApplication<App>;
  let db: Database;
  let billing: BillingService;
  let token: string;
  let organisationId: string;
  let ownerUserId: string;
  let siteId: string;
  let hostId: string;
  const runId = Date.now();
  const visitorEmail = `maria-${runId}@e2e.test`;

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const outboxFor = async (to: string) =>
    db.query.notificationDeliveryInstructions.findMany({
      where: and(
        eq(notificationDeliveryInstructions.recipientReference, to),
        isNull(notificationDeliveryInstructions.deletedAt),
      ),
      orderBy: desc(notificationDeliveryInstructions.nextAttemptAt),
    });
  const settle = (ms = 1500) => new Promise((resolve) => setTimeout(resolve, ms));
  /** Mail is queued by an event handler after the response, so wait for it instead of guessing a delay. */
  async function queuedFor(to: string, subjectStart: string, timeoutMs = 20_000) {
    const until = Date.now() + timeoutMs;
    for (;;) {
      const row = (await outboxFor(to)).find((r) => r.subject?.startsWith(subjectStart));
      if (row || Date.now() > until) return row;
      await settle(500);
    }
  }

  async function checkIn(email: string | undefined) {
    const id = randomUUID();
    await request(app.getHttpServer())
      .post("/visits/check-in")
      .set(auth())
      .send({
        id,
        siteId,
        hostId,
        visitorName: "Maria Shikongo",
        visitorPhone: "+264811234567",
        visitorEmail: email,
        visitorTypeCode: "general",
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
    billing = moduleFixture.get(BillingService);

    const ownerEmail = `e2e-visitor-${runId}@example.test`;
    const created = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `E2E Visitor ${runId}`,
        sectorCode: "sme", acceptTerms: true,
        email: ownerEmail,
        password: "blue tractor sings 123",
      })
      .expect(201);
    organisationId = created.body.organisationId as string;
    const user = await db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, ownerEmail), isNull(applicationUsers.deletedAt)),
    });
    if (!user) throw new Error("owner missing");
    ownerUserId = user.id;
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
      .send({ siteId, name: "Facilities Desk" })
      .expect(201);
    hostId = host.body.id as string;
  });

  afterAll(async () => {
    if (organisationId)
      await db.update(organisations).set({ deletedAt: new Date() }).where(eq(organisations.id, organisationId));
    await app.close();
  });

  it("rejects the new routes without a token, and bad tokens on the public ones", async () => {
    const http = request(app.getHttpServer());
    await http.get("/notifications/preferences").expect(401);
    await http.get("/analytics/satisfaction/comments").expect(401);
    await http.post("/platform/billing/invoices/x/credit-notes").send({ amount: "1.00", reason: "test" }).expect(401);
    await http
      .post("/public/check-out/token")
      .send({ token: "x".repeat(40) })
      .expect(400);
    await http.post("/public/visit-survey").send({ token: "bad.token", rating: 5, comment: "hi" }).expect(401);
  });

  it("searches hosts for the picker", async () => {
    const hit = await request(app.getHttpServer()).get(`/hosts?siteId=${siteId}&q=facil`).set(auth()).expect(200);
    expect(hit.body.map((h: { displayName: string }) => h.displayName)).toEqual(["Facilities Desk"]);
    const miss = await request(app.getHttpServer()).get(`/hosts?siteId=${siteId}&q=zzz`).set(auth()).expect(200);
    expect(miss.body).toEqual([]);
  });

  let visitId: string;
  let signOutUrl: string;
  let ratingToken: string;

  it("queues a receipt with a personal sign-out link when the visitor typed an email address", async () => {
    visitId = await checkIn(visitorEmail);
    const receipt = await queuedFor(visitorEmail, "Your visit to");
    expect(receipt).toBeDefined();
    expect(receipt?.message).toContain("Hello Maria Shikongo,");
    expect(receipt?.message).toContain("Reference:");
    expect(receipt?.message).toContain("Kind regards,");
    const link = /https:\/\/[^\s]+\/check-out\?v=[^\s]+/.exec(receipt?.message ?? "");
    expect(link).not.toBeNull();
    signOutUrl = link?.[0] ?? "";
    expect(receipt?.html).toContain("/email/hero-");
    expect(receipt?.html).not.toContain("closing-");
  });

  it("queues nothing for a visitor who typed no email address", async () => {
    const before = (await outboxFor(visitorEmail)).length;
    await checkIn(undefined);
    await settle(800);
    expect((await outboxFor(visitorEmail)).length).toBe(before);
  });

  it("signs the visit out from the personal link, once, and the thank-you carries a rating link", async () => {
    const t = new URL(signOutUrl).searchParams.get("v") ?? "";
    const out = await request(app.getHttpServer()).post("/public/check-out/token").send({ token: t }).expect(201);
    expect(out.body.visitId).toBe(visitId);
    expect(out.body.surveyToken).toBeTruthy();
    // A second use is an idempotent no-op, not an error and not a second thank-you.
    await request(app.getHttpServer()).post("/public/check-out/token").send({ token: t }).expect(201);
    await queuedFor(visitorEmail, "Thank you for visiting");
    await settle(1000);
    const thanks = (await outboxFor(visitorEmail)).filter((r) => r.subject?.startsWith("Thank you for visiting"));
    expect(thanks.length).toBe(1);
    expect(thanks[0].message).toContain("Time on site:");
    const rate = /https:\/\/[^\s]+\/rate\?t=([^\s]+)/.exec(thanks[0].message);
    expect(rate).not.toBeNull();
    ratingToken = decodeURIComponent(rate?.[1] ?? "");
  });

  it("records a 5-star style rating with an encrypted comment, once", async () => {
    const comment = `Quick and polite ${runId}`;
    await request(app.getHttpServer())
      .post("/public/visit-survey")
      .send({ token: ratingToken, rating: 4, comment })
      .expect(201);
    // The first answer wins; a retry changes nothing.
    await request(app.getHttpServer())
      .post("/public/visit-survey")
      .send({ token: ratingToken, rating: 1, comment: "changed" })
      .expect(201);
    const rows = await db.query.visitSurveyResponses.findMany({ where: eq(visitSurveyResponses.visitId, visitId) });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0].commentProtected)).not.toContain("Quick and polite");
  });

  it("keeps comments behind the stricter permission and shows figures to the broader one", async () => {
    const figures = await request(app.getHttpServer()).get("/analytics/satisfaction/detail").set(auth()).expect(200);
    expect(figures.body.responses).toBeGreaterThanOrEqual(1);
    expect(figures.body.distribution["4"]).toBeGreaterThanOrEqual(1);
    expect(figures.body.recentComments).toEqual([]);
    expect(figures.body.commentsIncluded).toBe(false);
    expect(JSON.stringify(figures.body)).not.toContain("Quick and polite");

    const withComments = await request(app.getHttpServer())
      .get("/analytics/satisfaction/comments")
      .set(auth())
      .expect(200);
    expect(withComments.body.recentComments.map((c: { comment: string }) => c.comment)).toContain(
      `Quick and polite ${runId}`,
    );
  });

  it("lets the organisation switch the receipt off, refuses to switch off security mail, and sends no receipt afterwards", async () => {
    const list = await request(app.getHttpServer()).get("/notifications/preferences").set(auth()).expect(200);
    const codes = list.body.map((r: { templateCode: string }) => r.templateCode);
    expect(codes).toContain("visitor_visit_receipt");
    expect(codes).not.toContain("password_reset");

    await request(app.getHttpServer())
      .put("/notifications/preferences")
      .set(auth())
      .send({ changes: [{ templateCode: "password_reset", enabled: false }] })
      .expect(400);
    await request(app.getHttpServer())
      .put("/notifications/preferences")
      .set(auth())
      .send({ changes: [{ templateCode: "visitor_visit_receipt", enabled: false }] })
      .expect(200);

    const quietEmail = `quiet-${runId}@e2e.test`;
    await checkIn(quietEmail);
    await settle();
    expect(await outboxFor(quietEmail)).toHaveLength(0);
  });

  it("issues a credit note within the outstanding balance and refuses one above it", async () => {
    const invoice = await billing.createInvoice({
      organisationId,
      amount: "1000.00",
      lineItems: [{ description: "Checkpoint plan", amount: "1000.00", quantity: 1 }],
    });
    const staff = {
      userId: ownerUserId,
      organisationId,
      siteId: null,
      roleCode: "platform_billing",
      permissions: [],
      emailVerified: true,
      mfaEnabled: true,
      audience: "ops" as const,
    };

    const first = await billing.issueCreditNote(
      invoice.id,
      { amount: "250.00", reason: "Goodwill for a delayed install" },
      staff as never,
    );
    expect(first.creditNoteNumber).toBe(`CN-${invoice.invoiceNumber}-01`);
    expect(first.balanceAfter).toBe("750.00");

    await expect(
      billing.issueCreditNote(invoice.id, { amount: "750.01", reason: "Too much on purpose" }, staff as never),
    ).rejects.toThrow(/cannot exceed the outstanding balance of 750.00/);
    await expect(
      billing.issueCreditNote(invoice.id, { amount: "-5", reason: "Negative amount here" }, staff as never),
    ).rejects.toThrow();
    const second = await billing.issueCreditNote(
      invoice.id,
      { amount: "750.00", reason: "Settle the remainder" },
      staff as never,
    );
    expect(second.creditNoteNumber).toBe(`CN-${invoice.invoiceNumber}-02`);
    expect(second.balanceAfter).toBe("0.00");
  });
});
