import * as React from "react";
import { cn } from "cn";

/**
 * A list of same-shape rows (invoices, tickets, org units) is one visual
 * object, not N stacked cards. `Card` applied per row was the lazy-
 * container default: each row carried its own rounded corners, ring, and
 * gap from its neighbors. `List` carries the chrome once; `ListRow` is a
 * flat flex row with a hairline top border between items (none on the
 * first).
 */
function List({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list"
      className={cn("overflow-hidden rounded-xl bg-card border border-[var(--elevation-2-border)]", className)}
      {...props}
    />
  );
}

function ListRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-row"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border",
        className,
      )}
      {...props}
    />
  );
}

export { List, ListRow };
