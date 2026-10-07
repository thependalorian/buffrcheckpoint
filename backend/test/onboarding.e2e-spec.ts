import "dotenv/config";

import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { and, eq, isNull, sql } from "drizzle-orm";
import { authenticator } from "otplib";
import request from "supertest";
import type { App } from "supertest/types";

import { AppModule } from "../src/app.module";
import { generateOpaqueToken, hashOpaqueToken } from "../src/common/crypto/secret-crypto";
import type { Database } from "../src/db/client";
import { DB } from "../src/db/db.module";
import { applicationUsers, emailVerificationTokens, organisations } from "../src/db/schema";
import { randomUUID } from "node:crypto";

jest.setTimeout(120_000);

/**
 * Launch-readiness experience (buffrcheckpoint.md §7): the server facts
 * the admin screens render. Runs against a disposable Neon branch.
 */
describe("Onboarding launch readiness (e2e)", () => {
  let app: INestApplication<App>;
  let db: Database;
  let token: string;
  let organisationId: string;
  const runId = Date.now();

  beforeAll(async () => {
    process.env.MFA_SECRET_ENCRYPTION_KEY =
      process.env.MFA_SECRET_ENCRYPTION_KEY ?? "test-mfa-secret-encryption-key-32chars!!";
    process.env.EMAIL_VERIFICATION_PEPPER = process.env.EMAIL_VERIFICATION_PEPPER ?? "test-email-pepper";
    process.env.MFA_CHALLENGE_PEPPER = process.env.MFA_CHALLENGE_PEPPER ?? "test-mfa-challenge-pepper";
    authenticator.options = { window: 1 };

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = moduleFixture.get(DB);

    const ownerEmail = `e2e-readiness-${runId}@example.test`;
    const created = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `E2E Readiness ${runId}`,
        sectorCode: "sme", acceptTerms: true,
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
  });

  afterAll(async () => {
    if (organisationId) {
      await db.update(organisations).set({ deletedAt: new Date() }).where(eq(organisations.id, organisationId));
    }
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const readiness = async () =>
    (await request(app.getHttpServer()).get("/auth/onboarding/readiness").set(auth()).expect(200)).body as {
      steps: Array<{ code: string; requirement: string; blockedBy: string[] }>;
      editing: unknown[];
    };
  const step = (body: Awaited<ReturnType<typeof readiness>>, code: string) => body.steps.find((s) => s.code === code);

  it("blocks the launch route until a site exists, in readiness and on write", async () => {
    const before = await readiness();
    expect(step(before, "launch_route")?.blockedBy).toEqual(["sites.at_least_one"]);
    expect(step(before, "flow_tests")?.blockedBy).toEqual(["sites.at_least_one", "hosts.at_least_one"]);
    expect(step(before, "devices_mdm")?.requirement).toBe("not_applicable");

    const refused = await request(app.getHttpServer())
      .post("/auth/onboarding/launch-route")
      .set(auth())
      .send({ route: "qr_first" })
      .expect(400);
    expect(refused.body.code).toBe("ONBOARDING_STEP_BLOCKED");
  });

  it("makes kiosk devices required once the kiosk route is chosen", async () => {
    const site = await request(app.getHttpServer())
      .post("/sites")
      .set(auth())
      .send({ name: "Main reception" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/hosts")
      .set(auth())
      .send({ siteId: site.body.id, name: "Reception host" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/auth/onboarding/launch-route")
      .set(auth())
      .send({ route: "kiosk" })
      .expect(200);
    const kiosk = await readiness();
    expect(step(kiosk, "launch_route")?.blockedBy).toEqual([]);
    expect(step(kiosk, "devices_mdm")?.requirement).toBe("required");
    expect(step(kiosk, "branding")).toBeUndefined(); // custom branding was retired

    await request(app.getHttpServer())
      .post("/auth/onboarding/launch-route")
      .set(auth())
      .send({ route: "qr_first" })
      .expect(200);
    const qr = await readiness();
    expect(step(qr, "devices_mdm")?.requirement).toBe("not_applicable");
  });

  it("creates one open test visit, idempotently, and checks it out exactly once", async () => {
    const preview = await request(app.getHttpServer()).get("/onboarding/test-visit").set(auth()).expect(200);
    expect(preview.body).toMatchObject({
      visit: null,
      target: { siteName: "Main reception", hostName: "Reception host" },
    });

    const id = randomUUID();
    const first = await request(app.getHttpServer())
      .post("/onboarding/test-visit")
      .set(auth())
      .send({ id })
      .expect(201);
    const retry = await request(app.getHttpServer())
      .post("/onboarding/test-visit")
      .set(auth())
      .send({ id })
      .expect(201);
    expect(first.body).toMatchObject({ visitId: id, checkedIn: true, siteName: "Main reception" });
    expect(retry.body.visitId).toBe(id);

    const open = await db.execute(sql`
      SELECT count(*)::int AS n FROM visitor_visits
      WHERE organisation_id = ${organisationId} AND checked_out_at IS NULL AND deleted_at IS NULL
    `);
    expect((open.rows[0] as { n: number }).n).toBe(1);

    await request(app.getHttpServer()).post(`/visits/${id}/check-out`).set(auth()).expect(201);
    const after = await db.execute(sql`
      SELECT count(*) FILTER (WHERE checked_out_at IS NULL)::int AS open, count(*)::int AS total
      FROM visitor_visits WHERE organisation_id = ${organisationId} AND deleted_at IS NULL
    `);
    expect(after.rows[0]).toEqual({ open: 0, total: 1 });

    const latest = await request(app.getHttpServer()).get("/onboarding/test-visit").set(auth()).expect(200);
    expect(latest.body.visit).toMatchObject({ visitId: id, checkedIn: false });
  });

  it("records advisory presence without blocking writes", async () => {
    const beat = await request(app.getHttpServer())
      .post("/auth/onboarding/presence")
      .set(auth())
      .send({ stepCode: "check_in_channels" })
      .expect(200);
    // The caller never sees themselves as another editor.
    expect(beat.body.editing).toEqual([]);
  });
});
