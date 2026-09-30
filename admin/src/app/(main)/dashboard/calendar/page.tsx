import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

import { ScheduleCalendar } from "./_components/calendar";
import type { CheckpointScheduleEvent } from "./_components/schedule-event";

// Grid view of the same /schedule data the plain-table Schedule page reads
// (dashboard/schedule/page.tsx) — that page favors a fast date-ordered
// list; this one favors seeing gaps and clustering across a month/week at a
// glance. Both are real views over the same backend data, not a demo/duplicate
// pair.
export default async function CalendarPage() {
  let events: CheckpointScheduleEvent[] = [];
  let error: string | null = null;
  try {
    events = await api.get<CheckpointScheduleEvent[]>("/schedule");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load the calendar.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Calendar"
        description="Pre-registered visitor arrivals, contractor schedules, and site activity by day, week, or list."
      />
      {error ? <DashboardErrorState message={error} /> : <ScheduleCalendar events={events} />}
    </div>
  );
}
