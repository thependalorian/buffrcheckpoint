import { and, eq, inArray, isNull } from "drizzle-orm";

import type { Database } from "../../db/client";
import { privacyRequestStatusLog, privacyRequests, typeDefinition } from "../../db/schema";
import { requestClock } from "./dsar-clock";

/** Counts open data requests close to or past their deadline. One organisation, or every organisation when none is given. */
export async function openRequestDeadlines(
  db: Database,
  organisationId?: string,
  now: Date = new Date(),
): Promise<{ dueSoon: number; overdue: number }> {
  const rows = await db
    .select({ id: privacyRequests.id, statusCode: typeDefinition.code })
    .from(privacyRequests)
    .innerJoin(typeDefinition, eq(privacyRequests.statusCode, typeDefinition.id))
    .where(
      organisationId
        ? and(eq(privacyRequests.organisationId, organisationId), isNull(privacyRequests.deletedAt))
        : isNull(privacyRequests.deletedAt),
    );
  const open = rows.filter((r) => r.statusCode === "pending" || r.statusCode === "in_review");
  if (open.length === 0) return { dueSoon: 0, overdue: 0 };
  const logs = await db.query.privacyRequestStatusLog.findMany({
    where: inArray(
      privacyRequestStatusLog.requestId,
      open.map((r) => r.id),
    ),
  });
  let dueSoon = 0;
  let overdue = 0;
  for (const request of open) {
    const state = requestClock(
      logs.filter((entry) => entry.requestId === request.id),
      true,
      now,
    ).state;
    if (state === "due_soon") dueSoon += 1;
    if (state === "overdue") overdue += 1;
  }
  return { dueSoon, overdue };
}
