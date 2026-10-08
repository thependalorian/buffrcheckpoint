"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { TableEmptyRow } from "@/components/dashboard-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { loadMoreAuditEvents } from "./actions";
import type { AuditEventRow } from "./types";

export function AuditLogTable({
  initialEvents,
  initialCursor,
  dateRange,
}: {
  initialEvents: AuditEventRow[];
  initialCursor: string | null;
  dateRange: { from?: string; to?: string };
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fromInput, setFromInput] = useState(dateRange.from ?? "");
  const [toInput, setToInput] = useState(dateRange.to ?? "");

  function applyDateRange() {
    const qs = new URLSearchParams();
    if (fromInput) qs.set("from", fromInput);
    if (toInput) qs.set("to", toInput);
    router.push(qs.toString() ? `/dashboard/audit?${qs}` : "/dashboard/audit");
  }

  function clearDateRange() {
    setFromInput("");
    setToInput("");
    router.push("/dashboard/audit");
  }

  function handleLoadMore() {
    if (!cursor) return;
    startTransition(async () => {
      try {
        const page = await loadMoreAuditEvents(cursor, dateRange);
        setEvents((prev) => [...prev, ...page.events]);
        setCursor(page.nextCursor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load more events.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Input
          type="date"
          aria-label="From date"
          className="h-7 w-36"
          value={fromInput}
          onChange={(event) => setFromInput(event.target.value)}
        />
        <span className="text-muted-foreground text-xs">to</span>
        <Input
          type="date"
          aria-label="To date"
          className="h-7 w-36"
          value={toInput}
          onChange={(event) => setToInput(event.target.value)}
        />
        <Button size="sm" variant="outline" onClick={applyDateRange}>
          Apply
        </Button>
        {dateRange.from || dateRange.to ? (
          <Button size="sm" variant="ghost" onClick={clearDateRange}>
            Clear
          </Button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/15">
            <TableRow>
              <TableHead className="h-11 p-3 font-medium">Action</TableHead>
              <TableHead className="h-11 p-3 font-medium">Resource</TableHead>
              <TableHead className="h-11 p-3 font-medium">Occurred at</TableHead>
              <TableHead className="h-11 p-3 font-medium">Event hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableEmptyRow
                colSpan={4}
                title="Nothing recorded yet"
                description="This log is hash-linked and append-only. It fills as soon as anyone performs a sensitive read, export, correction or role change."
              />
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="p-3 font-medium">{event.actionCode}</TableCell>
                  <TableCell className="p-3">{event.resourceType}</TableCell>
                  <TableCell className="p-3">{new Date(event.occurredAt).toLocaleString()}</TableCell>
                  <TableCell className="p-3 font-mono text-xs">{event.eventHash.slice(0, 12)}…</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {cursor ? (
        <Button variant="outline" onClick={handleLoadMore} disabled={isPending}>
          {isPending ? "Loading..." : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
