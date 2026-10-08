import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { KybController } from "./kyb.controller";
import { KybService } from "./kyb.service";

// Exercises the HTTP layer the service tests cannot: multipart parsing, the global validation pipe on the DTOs, and that the
// organisation always comes from the signed-in user, never from the body.
describe("KybController over HTTP", () => {
  let app: INestApplication;
  const service = {
    uploadDocument: jest.fn(async () => ({ id: "doc-1" })),
    submit: jest.fn(async () => ({ id: "kyb-1" })),
    validate: jest.fn(() => ({ ok: true, issues: [] })),
    decide: jest.fn(async () => ({ id: "kyb-1" })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [KybController], providers: [{ provide: KybService, useValue: service }] }).compile();
    app = moduleRef.createNestApplication();
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = { userId: "user-1", organisationId: "org-1", permissions: [] };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  const valid = {
    entityType: "close_corporation",
    businessRegistrationNumber: "CC/2024/09322",
    registeredBusinessName: "SAMPLE TRADING CC",
    registeredAddress: "Sample Street 12, Example Park, Windhoek",
    authorizedSignatoryName: "Anna Example",
    members: [{ fullName: "Anna Example", percentage: 100 }],
  };

  it("passes an uploaded file and its type to the service for the caller's own organisation", async () => {
    await request(app.getHttpServer())
      .post("/platform/kyb/documents")
      .field("documentType", "founding_statement")
      .attach("file", Buffer.from("%PDF-1.7 test"), { filename: "cc1.pdf", contentType: "application/pdf" })
      .expect(201);
    const [organisationId, user, file, documentType] = service.uploadDocument.mock.calls[0] as unknown as [string, { userId: string }, { buffer: Buffer; originalname: string }, string];
    expect(organisationId).toBe("org-1");
    expect(user.userId).toBe("user-1");
    expect(file.originalname).toBe("cc1.pdf");
    expect(file.buffer.toString()).toBe("%PDF-1.7 test");
    expect(documentType).toBe("founding_statement");
  });

  it("refuses a body that names an organisation", async () => {
    await request(app.getHttpServer()).post("/platform/kyb/submissions").send({ ...valid, organisationId: "someone-elses" }).expect(400);
    expect(service.submit).not.toHaveBeenCalled();
  });

  it("refuses an unknown business type and a malformed member", async () => {
    await request(app.getHttpServer()).post("/platform/kyb/submissions").send({ ...valid, entityType: "pirate_ship" }).expect(400);
    await request(app.getHttpServer())
      .post("/platform/kyb/submissions")
      .send({ ...valid, members: [{ fullName: "Anna Example", percentage: 250 }] })
      .expect(400);
    expect(service.submit).not.toHaveBeenCalled();
  });

  it("accepts a complete submission and a live validation request", async () => {
    await request(app.getHttpServer()).post("/platform/kyb/submissions").send(valid).expect(201);
    await request(app.getHttpServer()).post("/platform/kyb/validate").send(valid).expect(201);
    expect(service.submit).toHaveBeenCalledTimes(1);
  });

  it("only knows the three decisions, and a flagged field list is optional", async () => {
    await request(app.getHttpServer()).patch("/platform/kyb/submissions/kyb-1/decision").send({ decision: "maybe" }).expect(400);
    await request(app.getHttpServer())
      .patch("/platform/kyb/submissions/kyb-1/decision")
      .send({ decision: "needs_info", note: "Check the number", flaggedFields: ["businessRegistrationNumber"] })
      .expect(200);
    expect(service.decide).toHaveBeenCalledWith("kyb-1", "needs_info", expect.anything(), "Check the number", ["businessRegistrationNumber"]);
  });
});
