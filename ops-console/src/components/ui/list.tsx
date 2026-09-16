import type * as React from "react";

import { cn } from "cn";

/**
 * A list of same-shape rows (organisations, incidents, tickets, invoices,
 * timeline entries) is one visual object, not N stacked cards. `Card`
 * applied per row was the lazy-container default: each row carried its
 * own rounded corners, ring, and gap from its neighbors, so a 12-row list
 * rendered as 12 separate boxes rather than one scannable panel — and
 * nested three wrapper divs (Card > CardContent > flex row) per row for
 * no structural reason. `List` carries the chrome once; `ListRow` is a
 * flat flex row with a hairline top border between items (none on the
 * first), so N rows cost one extra div, not three.
 */
function List({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list"
      className={cn("overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}
      {...props}
    />
  );
}

function ListRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-row"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3 [&:not(:first-child)]:border-border [&:not(:first-child)]:border-t",
        className,
      )}
      {...props}
    />
  );
}

export { List, ListRow };
