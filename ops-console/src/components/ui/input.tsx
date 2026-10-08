import type * as React from "react";

import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--input-height-md)] w-full min-w-0 rounded-[var(--input-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-[var(--input-padding-x)] py-1 text-base text-[var(--input-text)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--input-placeholder)] hover:border-[var(--input-border-hover)] focus-visible:border-[var(--input-border-focus)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[var(--input-bg-disabled)] disabled:text-[var(--text-disabled)] aria-invalid:border-[var(--input-border-error)] read-only:border-[var(--border-subtle)] read-only:bg-[var(--surface-sunken)] read-only:text-[var(--text-secondary)] md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
