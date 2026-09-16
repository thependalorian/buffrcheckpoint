"use client";

import { useState } from "react";

import type { EventClickInfo } from "@fullcalendar/react";

import { EventCalendarViews } from "@/components/calendar/event-calendar-views";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { type CheckpointScheduleEvent, toFullCalendarEvents } from "./events-data";

interface SelectedEvent {
  title: string;
  start: Date | null;
  end: Date | null;
  typeCode: string;
  statusCode: string;
  accessScope: string;
}

export function ScheduleCalendar({ events }: { events: CheckpointScheduleEvent[] }) {
  const [selected, setSelected] = useState<SelectedEvent | null>(null);

  function handleEventClick(info: EventClickInfo) {
    setSelected({
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      typeCode: (info.event.extendedProps.typeCode as string) ?? "unknown",
      statusCode: (info.event.extendedProps.statusCode as string) ?? "unknown",
      accessScope: (info.event.extendedProps.accessScope as string) ?? "operational",
    });
  }

  return (
    <>
      <EventCalendarViews events={toFullCalendarEvents(events)} onEventClick={handleEventClick} />
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selected?.title}</SheetTitle>
            <SheetDescription>
              {selected?.start ? selected.start.toLocaleString() : "—"}
              {selected?.end ? ` – ${selected.end.toLocaleString()}` : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 px-4">
            <Badge variant="outline">{selected?.typeCode.replaceAll("_", " ")}</Badge>
            <Badge variant="outline">{selected?.statusCode.replaceAll("_", " ")}</Badge>
            <Badge variant="outline">{selected?.accessScope}</Badge>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
