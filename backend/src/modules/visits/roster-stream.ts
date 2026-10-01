import type { MessageEvent } from "@nestjs/common";
import { interval, map, merge, Observable } from "rxjs";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import {
  VISIT_ROSTER_CHANGED_EVENT,
  type VisitRosterChangedEvent,
} from "../../common/domain-events/visit-roster-changed.event";

// The slice of EventEmitter2 the stream needs; Node's EventEmitter also fits,
// which keeps this helper testable without the ESM-only Nest wrapper.
export interface RosterEventSource {
  on(event: string, listener: (event: VisitRosterChangedEvent) => void): unknown;
  off(event: string, listener: (event: VisitRosterChangedEvent) => void): unknown;
}

// Proxies and load balancers drop idle connections; a comment-free heartbeat
// event every 25 s keeps the stream open and lets the client notice a dead one.
export const ROSTER_STREAM_HEARTBEAT_MS = 25_000;

// Tenant isolation for the stream. TenantScopeGuard already rejects a
// ?siteId= outside a site-bound user's scope; this also covers the case where
// a site-bound user omits ?siteId, so they still only hear about their site.
export function rosterEventVisibleTo(
  event: VisitRosterChangedEvent,
  user: Pick<AuthenticatedUser, "organisationId" | "siteId">,
  requestedSiteId: string | undefined,
): boolean {
  if (event.organisationId !== user.organisationId) return false;
  if (user.siteId && event.siteId !== user.siteId) return false;
  if (requestedSiteId && event.siteId !== requestedSiteId) return false;
  return true;
}

export function rosterStream(
  events: RosterEventSource,
  user: Pick<AuthenticatedUser, "organisationId" | "siteId">,
  requestedSiteId: string | undefined,
  heartbeatMs = ROSTER_STREAM_HEARTBEAT_MS,
): Observable<MessageEvent> {
  const changes = new Observable<MessageEvent>((subscriber) => {
    const listener = (event: VisitRosterChangedEvent) => {
      if (!rosterEventVisibleTo(event, user, requestedSiteId)) return;
      subscriber.next({
        type: "roster_changed",
        data: { siteId: event.siteId, visitId: event.visitId, reason: event.reason },
      });
    };
    events.on(VISIT_ROSTER_CHANGED_EVENT, listener);
    return () => {
      events.off(VISIT_ROSTER_CHANGED_EVENT, listener);
    };
  });
  const heartbeat = interval(heartbeatMs).pipe(map((): MessageEvent => ({ type: "heartbeat", data: {} })));
  return merge(changes, heartbeat);
}
