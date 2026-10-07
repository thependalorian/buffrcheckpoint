import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { PersonalDataProtectionService } from "../../common/data-protection/personal-data-protection.service";
import { createSurveyToken } from "./survey-token";
import { VisitSurveyService } from "./visit-survey.service";

const visitId = "0b6f6a52-3c1f-4b5e-9a57-2f7d8e1c9a10";
const options = [1, 2, 3, 4, 5].map((score) => ({ code: `star_${score}`, label: `Star ${score}`, score }));

function build(opts: { checkedOut?: boolean; duplicate?: boolean; visitMissing?: boolean } = {}) {
  const inserts: Array<Record<string, unknown>> = [];
  const db = {
    select: () => ({ from: () => ({ where: () => ({ orderBy: async () => options }) }) }),
    query: {
      visitorVisits: {
        findFirst: async () =>
          opts.visitMissing
            ? undefined
            : {
                id: visitId,
                organisationId: "org-1",
                siteId: "site-1",
                checkedOutAt: opts.checkedOut === false ? null : new Date(),
              },
      },
    },
    insert: () => ({
      values: (row: Record<string, unknown>) => {
        inserts.push(row);
        return {
          onConflictDoNothing: () => ({ returning: async () => (opts.duplicate ? [] : [{ id: row.id }]) }),
          // biome-ignore lint/suspicious/noThenProperty: mimics drizzle's awaitable insert builder
          then: (resolve: (v: unknown) => void) => resolve(undefined),
        };
      },
    }),
  };
  const typeDefs = { id: jest.fn(async (_d: string, code: string) => `id-${code}`) };
  const protection = new PersonalDataProtectionService();
  return { service: new VisitSurveyService(db as never, typeDefs as never, protection), inserts, typeDefs, protection };
}

describe("VisitSurveyService.submit", () => {
  beforeAll(() => {
    process.env.QR_TOKEN_PEPPER = "test-pepper";
  });
  const token = () => createSurveyToken(visitId, "qr");

  it("stores a star rating and an encrypted comment, never the plain text", async () => {
    const { service, inserts, typeDefs, protection } = build();
    const result = await service.submit({ token: token(), rating: 4, comment: "  Friendly front desk.  " });
    expect(result).toEqual({ recorded: true, duplicate: false });
    expect(typeDefs.id).toHaveBeenCalledWith("satisfaction_rating", "star_4");
    const row = inserts[0];
    expect(JSON.stringify(row)).not.toContain("Friendly front desk");
    expect(protection.decrypt(row.commentProtected as never)).toBe("Friendly front desk.");
    expect(inserts).toHaveLength(2); // response row and its status event
  });

  it("still accepts the old rating-code call from the kiosk, with no comment", async () => {
    const { service, inserts } = build();
    await service.submit({ token: token(), ratingCode: "good" });
    expect(inserts[0].commentProtected).toBeNull();
    expect(inserts[0].ratingCode).toBe("id-good");
  });

  it("is idempotent: a repeat is accepted and writes no status event", async () => {
    const { service, inserts } = build({ duplicate: true });
    expect(await service.submit({ token: token(), rating: 5 })).toEqual({ recorded: true, duplicate: true });
    expect(inserts).toHaveLength(1);
  });

  it("rejects a bad token, a bad rating, an over-long comment, a missing rating and an unfinished visit", async () => {
    await expect(build().service.submit({ token: "nope", rating: 5 })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(build().service.submit({ token: token(), rating: 6 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(build().service.submit({ token: token(), rating: 2.5 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      build().service.submit({ token: token(), rating: 3, comment: "x".repeat(1001) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(build().service.submit({ token: token() })).rejects.toBeInstanceOf(BadRequestException);
    await expect(build({ checkedOut: false }).service.submit({ token: token(), rating: 3 })).rejects.toThrow(
      /after sign-out/,
    );
  });
});

describe("VisitSurveyService.detail", () => {
  it("returns the average, a 1 to 5 distribution, per-site figures and decrypted recent comments, skipping unreadable ones", async () => {
    const protection = new PersonalDataProtectionService();
    const good = protection.encrypt("Quick and polite.");
    const rows = [
      [
        { score: 5, n: 3 },
        { score: 4, n: 1 },
        { score: 1, n: 1 },
      ],
      [{ site_id: "site-1", site_name: "Main", n: 5, total: 20 }],
      [
        {
          id: "r1",
          site_id: "site-1",
          site_name: "Main",
          submitted_at: "2026-10-06T08:00:00Z",
          score: 5,
          comment_protected: good,
        },
        {
          id: "r2",
          site_id: "site-1",
          site_name: "Main",
          submitted_at: "2026-10-05T08:00:00Z",
          score: 1,
          comment_protected: { ciphertext: "broken" },
        },
      ],
    ];
    let call = 0;
    const db = { execute: jest.fn(async () => ({ rows: rows[call++] })) };
    const service = new VisitSurveyService(db as never, {} as never, protection);

    const result = await service.detail({ organisationId: "org-1", from: "2026-09-09", to: "2026-10-07" });

    expect(result.responses).toBe(5);
    expect(result.averageRating).toBe(4);
    expect(result.distribution).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 3 });
    expect(result.bySite).toEqual([{ siteId: "site-1", siteName: "Main", responses: 5, averageRating: 4 }]);
    expect(result.recentComments).toHaveLength(1);
    expect(result.recentComments[0]).toMatchObject({
      id: "r1",
      rating: 5,
      comment: "Quick and polite.",
      siteName: "Main",
    });
    expect(db.execute).toHaveBeenCalledTimes(3);
  });

  it("reports an empty period without dividing by zero", async () => {
    const db = { execute: jest.fn(async () => ({ rows: [] })) };
    const service = new VisitSurveyService(db as never, {} as never, new PersonalDataProtectionService());
    const result = await service.detail({
      organisationId: "org-1",
      from: "2026-09-09",
      to: "2026-10-07",
      siteId: "site-9",
    });
    expect(result).toMatchObject({ responses: 0, averageRating: null, bySite: [], recentComments: [] });
  });

  it("does not read the comments at all when the caller is not allowed them", async () => {
    const protection = new PersonalDataProtectionService();
    const decrypt = jest.spyOn(protection, "decrypt");
    const rows = [[{ score: 5, n: 2 }], [{ site_id: "site-1", site_name: "Main", n: 2, total: 10 }]];
    let call = 0;
    const db = { execute: jest.fn(async () => ({ rows: rows[call++] ?? [] })) };
    const service = new VisitSurveyService(db as never, {} as never, protection);

    const result = await service.detail({
      organisationId: "org-1",
      from: "2026-09-09",
      to: "2026-10-07",
      includeComments: false,
    });

    expect(result.recentComments).toEqual([]);
    expect(result.commentsIncluded).toBe(false);
    expect(result.responses).toBe(2);
    expect(decrypt).not.toHaveBeenCalled();
    expect(db.execute).toHaveBeenCalledTimes(2); // the comment query is not run
  });
});
