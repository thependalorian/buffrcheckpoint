"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { List, ListRow } from "@/components/ui/list";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusSelect } from "@/components/ui/status-select";
import {
  type BulkStatusResult,
  bulkUpdateIncidentStatusAction,
  bulkUpdateTicketStatusAction,
  updateOneIncidentStatusAction,
  updateOneTicketStatusAction,
} from "@/lib/bulk-status-actions";

export interface BulkQueueRow {
  id: string;
  title: string;
  href: string;
  subtitle: string | null;
}

/**
 * The ticket and incident queues are the same interaction: select rows, move
 * them all to one status. One component rather than two near-identical ones —
 * `kind` picks the server action, because a client component cannot take a
 * server action as a prop.
 */
export function BulkQueueList({
  kind,
  rows,
  statuses,
}: {
  kind: "ticket" | "incident";
  rows: BulkQueueRow[];
  statuses: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    if (selected.size === 0 || !status) return;
    const ids = [...selected];
    startTransition(async () => {
      const result =
        kind === "ticket"
          ? await bulkUpdateTicketStatusAction(ids, status)
          : await bulkUpdateIncidentStatusAction(ids, status);
      if ("error" in result) {
        setFeedback(result.error);
        return;
      }
      setFeedback(describe(result, status));
      setSelected(new Set());
      setStatus("");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-muted-foreground text-xs">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
            aria-label="Select all"
          />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>
        <NativeSelect
          size="sm"
          value={status}
          disabled={selected.size === 0 || pending}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Bulk status"
        >
          <option value="">Move selected to…</option>
          {statuses.map((option) => (
            <option key={option} value={option}>
              {option.replaceAll("_", " ")}
            </option>
          ))}
        </NativeSelect>
        <Button size="sm" variant="outline" disabled={selected.size === 0 || !status || pending} onClick={apply}>
          {pending ? "Applying…" : "Apply"}
        </Button>
        {feedback ? <span className="text-muted-foreground text-xs">{feedback}</span> : null}
      </div>

      <List>
        {rows.map((row) => (
          <ListRow key={row.id}>
            <div className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
                aria-label={`Select ${row.title}`}
              />
              <div className="min-w-0">
                <Link href={row.href} className="font-medium text-foreground text-sm hover:underline">
                  {row.title}
                </Link>
                {row.subtitle ? <p className="text-muted-foreground text-xs">{row.subtitle}</p> : null}
              </div>
            </div>
            <StatusSelect
              options={statuses.map((option) => ({ value: option, label: option.replaceAll("_", " ") }))}
              onChange={(next) =>
                kind === "ticket" ? updateOneTicketStatusAction(row.id, next) : updateOneIncidentStatusAction(row.id, next)
              }
            />
          </ListRow>
        ))}
      </List>
    </div>
  );
}

// A partial failure is the interesting case: one stale id in a 20-row
// selection must not read as "nothing happened".
function describe(result: BulkStatusResult, status: string): string {
  if (result.failed.length === 0) return `${result.updated} moved to ${status.replaceAll("_", " ")}.`;
  return `${result.updated} of ${result.requested} moved. ${result.failed.length} failed: ${result.failed[0].reason}`;
}
