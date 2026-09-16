"use client";

import { useState, useTransition } from "react";

import { TableEmptyRow } from "@/components/dashboard-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { loadMoreAuditEvents } from "./actions";
import type { AuditEventRow } from "./types";

export function AuditLogTable({
  initialEvents,
  initialCursor,
}: {
  initialEvents: AuditEventRow[];
  initialCursor: string | null;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    if (!cursor) return;
    startTransition(async () => {
      try {
        const page = await loadMoreAuditEvents(cursor);
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
                description="This is the hash-linked, append-only chain (Section 11.2). It fills the moment anyone performs a sensitive read, export, correction, or role change."
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
