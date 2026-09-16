import type { ReactNode } from "react";

// Every dashboard list route repeats "title + one-line description,"
// several with a right-aligned action (Generate Evidence Pack, etc.) — one
// shared header instead of copy-pasting the same two <h1>/<p> tags and an
// ad hoc flex wrapper across 15 routes.
export function DashboardPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
