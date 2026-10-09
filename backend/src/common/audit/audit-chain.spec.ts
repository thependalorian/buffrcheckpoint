import { appendAuditEvent, chainTip, computeAuditEventHash, verifyChain } from "./audit-chain";

const input = { organisationId: "o1", actorId: null, actionCode: "x.y", resourceType: "t", resourceId: null };

function fakeDb(failures: number, tips: Array<string | null>) {
  let call = 0;
  let inserts = 0;
  const inserted: Array<{ prevEventHash: string | null }> = [];
  return {
    inserted,
    db: {
      query: {
        auditEvents: {
          findMany: async () =>
            ((t) => (t ? [{ eventHash: t, prevEventHash: null }] : []))(tips[Math.min(call++, tips.length - 1)]),
        },
      },
      insert: () => ({
        values: async (row: { prevEventHash: string | null }) => {
          inserts++;
          if (inserts <= failures) throw Object.assign(new Error("duplicate"), { code: "23505" });
          inserted.push(row);
        },
      }),
    } as never,
  };
}

describe("appendAuditEvent", () => {
  it("re-reads the tip and retries when another writer took the previous hash", async () => {
    const { db, inserted } = fakeDb(1, ["aaa", "bbb"]);
    await appendAuditEvent(db, input);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].prevEventHash).toBe("bbb"); // the second attempt chained to the new tip
  });

  it("gives up after repeated collisions rather than looping forever", async () => {
    const { db } = fakeDb(99, ["aaa"]);
    await expect(appendAuditEvent(db, input)).rejects.toThrow("duplicate");
  });

  it("does not swallow other database errors", async () => {
    const db = {
      query: { auditEvents: { findMany: async () => [] } },
      insert: () => ({
        values: async () => {
          throw new Error("connection reset");
        },
      }),
    } as never;
    await expect(appendAuditEvent(db, input)).rejects.toThrow("connection reset");
  });
});

type Ev = {
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
function link(id: string, prev: string | null, at: string): Ev {
  const base = {
    id,
    organisationId: "o1",
    actorId: null,
    actionCode: "x.y",
    resourceType: "t",
    resourceId: null,
    occurredAt: new Date(at),
    prevEventHash: prev,
  };
  return { ...base, eventHash: computeAuditEventHash(base) };
}

describe("chainTip", () => {
  it("picks the event nobody points at, even when two events share a timestamp and the older one is listed first", () => {
    const a = link("a", null, "2026-10-07T08:00:00.000Z");
    const b = link("b", a.eventHash, "2026-10-07T08:00:00.000Z"); // same millisecond as its predecessor
    expect(chainTip([a, b])?.id).toBe("b");
    expect(chainTip([b, a])?.id).toBe("b");
  });

  it("returns nothing for an empty chain", () => {
    expect(chainTip([])).toBeUndefined();
  });
});

describe("verifyChain", () => {
  it("accepts a chain whose events tie on time, because it follows links and not timestamps", () => {
    const a = link("a", null, "2026-10-07T08:00:00.000Z");
    const b = link("b", a.eventHash, "2026-10-07T08:00:00.000Z");
    const c = link("c", b.eventHash, "2026-10-07T08:00:00.000Z");
    expect(verifyChain([c, a, b])).toEqual({ valid: true, brokenAtEventId: null });
  });

  it("flags a fork, an edited event and an orphan", () => {
    const a = link("a", null, "2026-10-07T08:00:00.000Z");
    const b = link("b", a.eventHash, "2026-10-07T08:00:01.000Z");
    const fork = link("fork", a.eventHash, "2026-10-07T08:00:02.000Z");
    expect(verifyChain([a, b, fork]).valid).toBe(false);
    expect(verifyChain([a, { ...b, actionCode: "tampered" }])).toEqual({ valid: false, brokenAtEventId: "b" });
    const orphan = link("orphan", "not-a-real-hash", "2026-10-07T08:00:03.000Z");
    expect(verifyChain([a, b, orphan])).toEqual({ valid: false, brokenAtEventId: "orphan" });
  });

  describe("former organisation ids (organisation merge)", () => {
    const made = (id: string, prev: string | null, org: string, action = "x") => {
      const base = {
        organisationId: org,
        actorId: null,
        actionCode: action,
        resourceType: "t",
        resourceId: null,
        occurredAt: new Date("2026-09-10T08:00:00.000Z"),
        prevEventHash: prev,
      };
      return { id, ...base, eventHash: computeAuditEventHash(base) };
    };

    it("accepts events hashed under a registered former id after rows were moved to the current id", () => {
      const a = made("a", null, "old-org");
      const b = made("b", a.eventHash, "old-org");
      const moved = [a, b].map((e) => ({ ...e, organisationId: "new-org" }));
      expect(verifyChain(moved).valid).toBe(false);
      expect(verifyChain(moved, new Set(), ["old-org"])).toEqual({ valid: true, brokenAtEventId: null });
    });

    it("still rejects an edited event and an event hashed under an unregistered id", () => {
      const a = made("a", null, "old-org");
      const moved = [{ ...a, organisationId: "new-org" }];
      expect(verifyChain([{ ...moved[0], actionCode: "tampered" }], new Set(), ["old-org"]).valid).toBe(false);
      expect(verifyChain(moved, new Set(), ["some-other-org"]).valid).toBe(false);
    });
  });

  describe("registered legacy forks", () => {
    const t = (n: number) => `2026-09-10T08:00:0${n}.000Z`;

    it("accepts a registered side branch and second root, and keeps walking the main line", () => {
      const root = link("root", null, t(0));
      const side = link("side", root.eventHash, t(0));
      const main1 = link("main1", root.eventHash, t(1));
      const main2 = link("main2", main1.eventHash, t(2));
      const root2 = link("root2", null, t(3));
      const r2kid = link("r2kid", root2.eventHash, t(4));
      const events = [root, side, main1, main2, root2, r2kid];
      expect(verifyChain(events).valid).toBe(false);
      expect(verifyChain(events, new Set(["side", "root2"]))).toEqual({ valid: true, brokenAtEventId: null });
    });

    it("still catches an edited event after the fork and a new unregistered fork", () => {
      const root = link("root", null, t(0));
      const side = link("side", root.eventHash, t(0));
      const main1 = link("main1", root.eventHash, t(1));
      const main2 = link("main2", main1.eventHash, t(2));
      const accepted = new Set(["side"]);
      expect(verifyChain([root, side, main1, { ...main2, actionCode: "tampered" }], accepted)).toEqual({
        valid: false,
        brokenAtEventId: "main2",
      });
      const newFork = link("newFork", main1.eventHash, t(3));
      expect(verifyChain([root, side, main1, main2, newFork], accepted).valid).toBe(false);
    });

    it("does not accept a registered event that was edited", () => {
      const root = link("root", null, t(0));
      const side = link("side", root.eventHash, t(0));
      const main1 = link("main1", root.eventHash, t(1));
      expect(verifyChain([root, { ...side, actionCode: "tampered" }, main1], new Set(["side"]))).toEqual({
        valid: false,
        brokenAtEventId: "side",
      });
    });
  });

  it("treats an empty chain as valid", () => {
    expect(verifyChain([])).toEqual({ valid: true, brokenAtEventId: null });
  });
});
