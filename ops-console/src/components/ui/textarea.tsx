import type * as React from "react";

import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-[var(--input-padding-x)] py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-[var(--input-border-focus)] disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
