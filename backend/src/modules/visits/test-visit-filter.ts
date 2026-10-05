import { type AnyColumn, type SQL, sql } from "drizzle-orm";

export const TEST_VISIT_CHANNEL_CODE = "onboarding_test";

/**
 * Onboarding test visits prove the check-in flow works but must never count
 * as real traffic (analytics, reports, health, anomaly rules). Pass the
 * visit's arrival_channel_code column, or a raw alias for hand-written SQL.
 */
export function isRealVisit(arrivalChannel: AnyColumn | SQL): SQL {
  return sql`${arrivalChannel} IS DISTINCT FROM (
    SELECT id FROM type_definition
    WHERE domain = 'capture_channel' AND code = ${TEST_VISIT_CHANNEL_CODE} AND deleted_at IS NULL
    LIMIT 1
  )`;
}

/** Raw-alias form for hand-written queries over `visitor_visits <alias>`. */
export function isRealVisitAlias(alias: "v"): SQL {
  return isRealVisit(sql.raw(`${alias}.arrival_channel_code`));
}
