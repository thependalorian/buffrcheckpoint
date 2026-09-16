import "dotenv/config";

import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";

import { AppModule } from "../src/app.module";

jest.setTimeout(60_000);

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET) is public and returns ok", () => {
    return request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect({ status: "ok", service: "buffrcheckpoint-backend" });
  });

  it("a protected route without a token is rejected", () => {
    return request(app.getHttpServer()).get("/sites").expect(401);
  });

  it("/public/capability-status returns six public capability keys", async () => {
    const res = await request(app.getHttpServer()).get("/public/capability-status").expect(200);
    expect(Object.keys(res.body).sort()).toEqual(
      [
        "diginamVerification",
        "nationalEidNfc",
        "nfcBadgeCheckIn",
        "qrInvitationCheckIn",
        "smsContactConfirmation",
        "ussd",
      ].sort(),
    );
  });

  it("/organisation/capability-enablement without token is 401 (route exists)", () => {
    return request(app.getHttpServer()).get("/organisation/capability-enablement").expect(401);
  });
});
