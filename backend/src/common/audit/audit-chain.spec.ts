import type { Database } from "../../db/client";
import { AuditService } from "../../modules/audit/audit.service";
import { appendAuditEvent } from "./audit-chain";

type Row = {
  id: string;
  organisationId: string;
  actorId: string | null;
  actionCode: string;
  resourceType: string;
  resourceId: string | null;
  occurredAt: Date;
  prevEventHash: string | null;
  eventHash: string;
};

// In-memory stand-in for the two calls the chain makes: "latest row for this
// organisation" and "insert". Rows are kept in insertion order, which is also
// occurredAt order because appends here are strictly sequential.
function fakeDb(rows: Row[]) {
  return {
    query: {
      auditEvents: {
        findFirst: jest.fn(async () => rows.at(-1)),
        findMany: jest.fn(async () => rows),
      },
    },
    insert: jest.fn(() => ({
      values: jest.fn(async (row: Row) => {
        rows.push(row);
      }),
    })),
  } as unknown as Database;
}

const user = { organisationId: "org-1" } as Parameters<AuditService["verifyChainIntegrity"]>[0];

describe("audit chain", () => {
  it("links user and system events into one chain that verifies", async () => {
    const rows: Row[] = [];
    const db = fakeDb(rows);
    const base = { organisationId: "org-1", resourceType: "visit", resourceId: "visit-1" };

    await appendAuditEvent(db, { ...base, actorId: "user-1", actionCode: "visit.read" });
    await appendAuditEvent(db, { ...base, actorId: null, actionCode: "retention.disposition" });
    await new AuditService(db).append({ ...base, actorId: "user-2", actionCode: "visit.roster.export" });

    expect(rows).toHaveLength(3);
    expect(rows[0].prevEventHash).toBeNull();
    expect(rows[1].prevEventHash).toBe(rows[0].eventHash);
    expect(rows[2].prevEventHash).toBe(rows[1].eventHash);
    await expect(new AuditService(db).verifyChainIntegrity(user)).resolves.toEqual({
      valid: true,
      brokenAtEventId: null,
    });
  });

  it("reports the first tampered row", async () => {
    const rows: Row[] = [];
    const db = fakeDb(rows);
    for (const actionCode of ["a", "b", "c"]) {
      await appendAuditEvent(db, {
        organisationId: "org-1",
        actorId: null,
        actionCode,
        resourceType: "x",
        resourceId: null,
      });
    }
    rows[1].actionCode = "edited";

    await expect(new AuditService(db).verifyChainIntegrity(user)).resolves.toEqual({
      valid: false,
      brokenAtEventId: rows[1].id,
    });
  });
});
