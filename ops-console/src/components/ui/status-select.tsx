"use client";

import { useTransition } from "react";

import { NativeSelect } from "@/components/ui/native-select";

/**
 * A row of 4-5 always-visible outline buttons (one per possible status) was
 * the repeated pattern across incidents, tickets, and CRM deals — three
 * near-identical components, each rendering every possible transition as
 * its own full-size button regardless of how often it's used. One select
 * does the same job in a fifth of the space and reads as "change status,"
 * not "five equally-weighted actions."
 */
export function StatusSelect({
  options,
  placeholder = "Change status…",
  disabled,
  onChange,
}: {
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (next: string) => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const isDisabled = pending || Boolean(disabled);

  return (
    <NativeSelect
      size="sm"
      defaultValue=""
      disabled={isDisabled}
      onChange={(e) => {
        const next = e.target.value;
        if (!next) return;
        startTransition(() => {
          void onChange(next);
        });
        e.target.value = "";
      }}
    >
      <option value="" disabled>
        {pending ? "Updating…" : placeholder}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}
