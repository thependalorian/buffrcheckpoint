import { computeAuditEventHash } from "../../common/audit/audit-chain";
import { AuditChainVerifierService } from "./audit-chain-verifier.service";

function event(id: string, organisationId: string, prev: string | null, action: string) {
  const base = {
    organisationId,
    actorId: null,
    actionCode: action,
    resourceType: "x",
    resourceId: null,
    occurredAt: new Date("2026-10-08T10:00:00.000Z"),
    prevEventHash: prev,
  };
  return { id, ...base, eventHash: computeAuditEventHash(base) };
}

/** A database fake that answers the organisation list first, then each organisation's events in order. */
function build(chains: Array<{ organisationId: string; events: ReturnType<typeof event>[] }>) {
  const inserted: Array<Record<string, unknown>> = [];
  let eventQueries = 0;
  const db = {
    select: (fields?: unknown) => ({
      from: () =>
        fields
          ? { groupBy: async () => chains.map((c) => ({ organisationId: c.organisationId })) }
          : { where: async () => chains[eventQueries++].events },
    }),
    // appendAuditEvent reads the newest events to find the chain tip, then inserts.
    query: { auditEvents: { findMany: async () => [] } },
    insert: () => ({
      values: async (v: Record<string, unknown>) => {
        inserted.push(v);
      },
    }),
  };
  return { service: new AuditChainVerifierService(db as never), inserted };
}

describe("audit chain verifier (LG-2)", () => {
  it("records a clean result for an intact chain and a break for a tampered one", async () => {
    const a1 = event("a1", "org-ok", null, "first");
    const a2 = event("a2", "org-ok", a1.eventHash, "second");
    const b1 = event("b1", "org-bad", null, "first");
    const b2 = { ...event("b2", "org-bad", b1.eventHash, "second"), actionCode: "changed-after-the-fact" };

    const { service, inserted } = build([
      { organisationId: "org-ok", events: [a1, a2] },
      { organisationId: "org-bad", events: [b1, b2] },
    ]);
    const summary = await service.verifyAll();

    expect(summary.organisations).toBe(2);
    expect(summary.breaks).toEqual([{ organisationId: "org-bad", brokenAtEventId: "b2" }]);
    expect(inserted.map((row) => [row.organisationId, row.actionCode])).toEqual([
      ["org-ok", "audit.chain_verified"],
      ["org-bad", "audit.chain_break_detected"],
    ]);
  });

  it("does nothing when no organisation has audit events", async () => {
    const { service, inserted } = build([]);
    expect(await service.verifyAll()).toEqual({ organisations: 0, breaks: [] });
    expect(inserted).toHaveLength(0);
  });
});
