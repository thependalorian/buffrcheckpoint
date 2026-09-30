import type { EventInput } from "@fullcalendar/react";

// Mirrors backend/src/modules/schedule/schedule.controller.ts's response
// shape exactly (GET /schedule?siteId=&from=&to=) — the admin/src/app/(main)/dashboard/schedule
// page's plain-table view already reads a subset of these fields; this
// interface is the full contract shared by both that table and this
// calendar grid.
export interface CheckpointScheduleEvent {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  typeCode: string;
  siteId: string;
  zoneId: string | null;
  statusCode: string;
  accessScope: "operational" | "restricted";
}

// Release 1 scope is pre-registered-visitor arrivals only (schedule.controller.ts),
// so this map currently has one real entry — kept as a map (not an
// if/else) so the credential-expiry/induction-expiry/control-review event
// types the backend comment flags as a Release 1.5+ gap slot in without a
// second code path once they exist.
const EVENT_TYPE_COLOR: Record<string, { color: string; contrastColor: string }> = {
  pre_registered_arrival: { color: "var(--color-sodium-yellow)", contrastColor: "var(--color-carbon)" },
};

const DEFAULT_EVENT_COLOR = { color: "var(--color-slate)", contrastColor: "var(--color-pure-white)" };

export function toFullCalendarEvents(events: CheckpointScheduleEvent[]): EventInput[] {
  return events.map((event) => {
    const palette = EVENT_TYPE_COLOR[event.typeCode] ?? DEFAULT_EVENT_COLOR;
    return {
      id: event.id,
      title: event.title,
      start: event.startsAt ?? undefined,
      end: event.endsAt ?? undefined,
      allDay: event.allDay,
      color: palette.color,
      contrastColor: palette.contrastColor,
      extendedProps: {
        typeCode: event.typeCode,
        siteId: event.siteId,
        zoneId: event.zoneId,
        statusCode: event.statusCode,
        accessScope: event.accessScope,
      },
    } satisfies EventInput;
  });
}
