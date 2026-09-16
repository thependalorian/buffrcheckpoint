"use client";

import Calendar, { type EventClickInfo, type EventInput } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/palette.css";
import "@fullcalendar/react/themes/classic/theme.css";
import classicTheme from "@fullcalendar/react/themes/classic";
import timeGridPlugin from "@fullcalendar/react/timegrid";

// v7 moved the standard view packages to @fullcalendar/react/* entrypoints
// (they're no longer separate @fullcalendar/daygrid-style npm packages —
// those stalled at 7.0.0-rc.0 and were never published stable). A `plugins`
// array is still required at runtime: omitting it throws 'viewType
// "dayGridMonth" is not available' even though the types compile fine
// without it, since PluginInput[] defaults to empty.
//
// v7's "classic" theme also replaced v6's semantic .fc-* class names
// (.fc-button, .fc-daygrid-day, ...) with hashed atomic classes
// (.fc-classic-n5m, ...) that aren't meant to be targeted directly, and —
// unlike views — a theme isn't opt-in via CSS import alone: themes/classic
// is itself a PluginInput that must go in the `plugins` array, or its CSS
// classes never get applied to the DOM at all (confirmed by inspecting
// rendered class names: only skeleton.css's unthemed fc-XX classes showed
// up until this plugin was added). Theming then goes through the
// documented --fc-classic-* custom properties (themes/classic/palette.css)
// — re-pinned below to the Buffr Checkpoint tokens instead of the theme's
// stock blue/slate defaults.
export interface EventCalendarViewsProps {
  events: EventInput[];
  onEventClick?: (info: EventClickInfo) => void;
}

export function EventCalendarViews({ events, onEventClick }: EventCalendarViewsProps) {
  return (
    <div className="checkpoint-calendar rounded-lg border bg-card p-2">
      <Calendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, classicTheme]}
        events={events}
        eventClick={onEventClick}
        initialView="dayGridMonth"
        headerToolbar={{
          start: "prev,next today",
          center: "title",
          end: "dayGridMonth,timeGridWeek,listWeek",
        }}
        height="auto"
        dayMaxEvents={3}
        firstDay={1}
        nowIndicator
      />
      <style jsx global>{`
        .checkpoint-calendar {
          --fc-classic-button: var(--card);
          --fc-classic-button-border: var(--border);
          --fc-classic-button-strong: var(--primary);
          --fc-classic-button-strong-border: var(--primary);
          --fc-classic-button-outline: var(--ring);
          --fc-classic-button-foreground: var(--foreground);

          --fc-classic-primary: var(--primary);
          --fc-classic-primary-foreground: var(--primary-foreground);

          --fc-classic-background-event: var(--secondary);
          --fc-classic-highlight: color-mix(in srgb, var(--primary) 15%, transparent);
          --fc-classic-today: color-mix(in srgb, var(--primary) 10%, transparent);
          --fc-classic-now: var(--destructive);

          --fc-classic-background: var(--card);
          --fc-classic-faint: var(--muted);
          --fc-classic-muted: var(--muted);
          --fc-classic-strong: var(--border);

          --fc-classic-foreground: var(--foreground);
          --fc-classic-faint-foreground: var(--muted-foreground);
          --fc-classic-muted-foreground: var(--muted-foreground);

          --fc-classic-border: var(--border);
          --fc-classic-strong-border: var(--border);

          font-family: var(--font-sans);
        }
      `}</style>
    </div>
  );
}
