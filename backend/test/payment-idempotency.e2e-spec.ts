import "dotenv/config";

import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { and, eq, isNull } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types";

import { AppModule } from "../src/app.module";
import { generateOpaqueToken, hashOpaqueToken } from "../src/common/crypto/secret-crypto";
import type { Database } from "../src/db/client";
import { DB } from "../src/db/db.module";
import {
  applicationUsers,
  emailVerificationTokens,
  invoice,
  organisationMemberships,
  organisations,
  paymentTransaction,
  roleDefinitions,
  sites,
} from "../src/db/schema";
import { TypeDefinitionLookupService } from "../src/db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

jest.setTimeout(90_000);

// MP-1: the client sends an idempotency key and the server enforces it, so a retry never records a second payment.
describe("payment idempotency (e2e)", () => {
  let app: INestApplication<App>;
  let db: Database;
  let typeDefs: TypeDefinitionLookupService;
  const runId = Date.now();
  const orgIds: string[] = [];

  beforeAll(async () => {
    process.env.MFA_SECRET_ENCRYPTION_KEY =
      process.env.MFA_SECRET_ENCRYPTION_KEY ?? "test-mfa-secret-encryption-key-32chars!!";
    process.env.EMAIL_VERIFICATION_PEPPER = process.env.EMAIL_VERIFICATION_PEPPER ?? "test-email-pepper";
    process.env.MFA_CHALLENGE_PEPPER = process.env.MFA_CHALLENGE_PEPPER ?? "test-mfa-challenge-pepper";
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = moduleFixture.get(DB);
    typeDefs = moduleFixture.get(TypeDefinitionLookupService);
  });

  afterAll(async () => {
    for (const id of orgIds) {
      await db.update(sites).set({ deletedAt: new Date() }).where(eq(sites.organisationId, id));
      await db
        .update(organisationMemberships)
        .set({ deletedAt: new Date() })
        .where(eq(organisationMemberships.organisationId, id));
      await db.update(roleDefinitions).set({ deletedAt: new Date() }).where(eq(roleDefinitions.organisationId, id));
      await db.update(applicationUsers).set({ deletedAt: new Date() }).where(eq(applicationUsers.organisationId, id));
      await db.update(invoice).set({ deletedAt: new Date() }).where(eq(invoice.organisationId, id));
      await db.update(organisations).set({ deletedAt: new Date() }).where(eq(organisations.id, id));
    }
    await app.close();
  });

  async function owner(label = "a") {
    const email = `e2e-pay-owner-${label}-${runId}@example.test`;
    const created = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `E2E Payment ${label} ${runId}`,
        sectorCode: "sme",
        acceptTerms: true,
        email,
        password: "blue tractor sings 123",
      })
      .expect(201);
    orgIds.push(created.body.organisationId);
    const user = await db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, email), isNull(applicationUsers.deletedAt)),
    });
    if (!user) throw new Error("owner missing");
    const raw = generateOpaqueToken();
    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      organisationId: user.organisationId,
      userId: user.id,
      tokenHash: hashOpaqueToken(raw, "EMAIL_VERIFICATION_PEPPER"),
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const verified = await request(app.getHttpServer())
      .post("/auth/email-verification/verify")
      .send({ token: raw })
      .expect(200);
    return { user, accessToken: verified.body.accessToken as string };
  }

  async function pop(token: string, invoiceId: string, key?: string) {
    const call = request(app.getHttpServer())
      .post("/platform/billing/payments/pop")
      .set("Authorization", `Bearer ${token}`);
    if (key) call.set("Idempotency-Key", key);
    return call.send({
      invoiceId,
      amount: "100.00",
      popDocumentName: "pop.pdf",
      popDocumentBase64: Buffer.from("%PDF-1.4 test").toString("base64"),
    });
  }

  it("records one payment for one key however often the request is sent, and a new key records another", async () => {
    const { user, accessToken } = await owner();
    const invoiceId = randomUUID();
    await db.insert(invoice).values({
      id: invoiceId,
      organisationId: user.organisationId,
      invoiceNumber: `E2E-PAY-${runId}`,
      amount: "100.00",
      statusCode: await typeDefs.id("invoice_status", "sent"),
    });
    const key = `retry-key-${runId}`;

    const first = await pop(accessToken, invoiceId, key);
    const second = await pop(accessToken, invoiceId, key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const afterRetry = await db.query.paymentTransaction.findMany({
      where: eq(paymentTransaction.invoiceId, invoiceId),
    });
    expect(afterRetry).toHaveLength(1);

    const other = await pop(accessToken, invoiceId, `second-key-${runId}`);
    expect(other.body.id).not.toBe(first.body.id);
    const afterNew = await db.query.paymentTransaction.findMany({ where: eq(paymentTransaction.invoiceId, invoiceId) });
    expect(afterNew).toHaveLength(2);
  });

  it("refuses a malformed key before anything is written", async () => {
    const { user, accessToken } = await owner("b");
    const invoiceId = randomUUID();
    await db.insert(invoice).values({
      id: invoiceId,
      organisationId: user.organisationId,
      invoiceNumber: `E2E-PAY-B-${runId}`,
      amount: "100.00",
      statusCode: await typeDefs.id("invoice_status", "sent"),
    });
    const bad = await pop(accessToken, invoiceId, "short");
    expect(bad.status).toBe(400);
    const rows = await db.query.paymentTransaction.findMany({ where: eq(paymentTransaction.invoiceId, invoiceId) });
    expect(rows).toHaveLength(0);
  });
});
