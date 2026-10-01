import type { MessageEvent } from "@nestjs/common";

import {
  VISIT_ROSTER_CHANGED_EVENT,
  VisitRosterChangedEvent,
} from "../../common/domain-events/visit-roster-changed.event";
import { rosterStream } from "./roster-stream";
import { EventEmitter } from "node:events";

const HOUR = 60 * 60 * 1000; // heartbeat far enough out not to fire in these tests

function collect(
  events: EventEmitter,
  user: { organisationId: string; siteId: string | null },
  siteId?: string,
  heartbeatMs = HOUR,
) {
  const received: MessageEvent[] = [];
  const subscription = rosterStream(events, user, siteId, heartbeatMs).subscribe((e) => received.push(e));
  return { received, subscription };
}

const emit = (events: EventEmitter, org: string, site: string, visit = "visit-1") =>
  events.emit(VISIT_ROSTER_CHANGED_EVENT, new VisitRosterChangedEvent(org, site, visit, "checked_in"));

describe("roster stream", () => {
  it("delivers own-organisation changes and never another organisation's", () => {
    const events = new EventEmitter();
    const orgWide = collect(events, { organisationId: "org-1", siteId: null });
    const otherOrg = collect(events, { organisationId: "org-2", siteId: null });

    emit(events, "org-1", "site-a");
    emit(events, "org-1", "site-b");

    expect(orgWide.received).toEqual([
      { type: "roster_changed", data: { siteId: "site-a", visitId: "visit-1", reason: "checked_in" } },
      { type: "roster_changed", data: { siteId: "site-b", visitId: "visit-1", reason: "checked_in" } },
    ]);
    expect(otherOrg.received).toHaveLength(0);
    orgWide.subscription.unsubscribe();
    otherOrg.subscription.unsubscribe();
  });

  it("limits a site-bound user to their site even without ?siteId", () => {
    const events = new EventEmitter();
    const siteBound = collect(events, { organisationId: "org-1", siteId: "site-a" });

    emit(events, "org-1", "site-a");
    emit(events, "org-1", "site-b");

    expect(siteBound.received.map((e) => (e.data as { siteId: string }).siteId)).toEqual(["site-a"]);
    siteBound.subscription.unsubscribe();
  });

  it("honours an explicit ?siteId for org-wide users", () => {
    const events = new EventEmitter();
    const filtered = collect(events, { organisationId: "org-1", siteId: null }, "site-b");

    emit(events, "org-1", "site-a");
    emit(events, "org-1", "site-b");

    expect(filtered.received.map((e) => (e.data as { siteId: string }).siteId)).toEqual(["site-b"]);
    filtered.subscription.unsubscribe();
  });

  it("sends heartbeats and removes its listener on disconnect", () => {
    jest.useFakeTimers();
    try {
      const events = new EventEmitter();
      const stream = collect(events, { organisationId: "org-1", siteId: null }, undefined, 1000);

      jest.advanceTimersByTime(2500);
      expect(stream.received.filter((e) => e.type === "heartbeat")).toHaveLength(2);
      expect(events.listenerCount(VISIT_ROSTER_CHANGED_EVENT)).toBe(1);

      stream.subscription.unsubscribe();
      expect(events.listenerCount(VISIT_ROSTER_CHANGED_EVENT)).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
