import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { AnalyticsService } from "../analytics/analytics.service";
import { isRealVisitAlias, TEST_VISIT_CHANNEL_CODE } from "./test-visit-filter";

const dialect = new PgDialect();

const user = {
  userId: "00000000-0000-0000-0000-0000000000aa",
  organisationId: "00000000-0000-0000-0000-0000000000bb",
  roleCode: "owner_operator",
  permissions: [],
  emailVerified: true,
  mfaEnabled: true,
  audience: "admin",
} as unknown as AuthenticatedUser;

describe("test visit exclusion", () => {
  it("renders a parameterised exclusion of the onboarding_test channel", () => {
    const query = dialect.sqlToQuery(isRealVisitAlias("v"));
    expect(query.sql).toContain("v.arrival_channel_code IS DISTINCT FROM");
    expect(query.sql).toContain("domain = 'capture_channel'");
    expect(query.params).toEqual([TEST_VISIT_CHANNEL_CODE]);
  });

  it("keeps test visits out of the live visit-activity chart", async () => {
    // A fake table holding one real and one test visit today. The fake only
    // drops the test row when the service's WHERE clause carries the
    // exclusion, so totals stay unchanged only if the filter is applied.
    const now = new Date();
    const rows = [
      { checkedInAt: now, test: false },
      { checkedInAt: now, test: true },
    ];
    const findMany = jest.fn(async ({ where }: { where: SQL }) => {
      const rendered = dialect.sqlToQuery(where);
      const excludesTests = rendered.params.includes(TEST_VISIT_CHANNEL_CODE);
      return rows.filter((r) => !(excludesTests && r.test)).map(({ checkedInAt }) => ({ checkedInAt }));
    });
    const db = {
      query: {
        visitorVisits: { findMany },
        auditEvents: { findMany: jest.fn(async () => []) },
      },
    } as unknown as Database;

    const points = await new AnalyticsService(db).visitActivity(7, user);
    const total = points.reduce((sum, p) => sum + p.checkIns, 0);
    expect(total).toBe(1);
  });
});
