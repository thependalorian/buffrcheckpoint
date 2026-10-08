import type { ReactNode } from "react";

// One header for every dashboard route: title, one-line description, an
// optional status chip beside the title and an optional action. It stacks on
// narrow screens so the action never squeezes the title.
export function DashboardPageHeader({
  title,
  description,
  action,
  status,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="bc-h-page tracking-tight">{title}</h1>
          {status}
        </div>
        <p className="mt-1 max-w-prose text-muted-foreground text-sm">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
