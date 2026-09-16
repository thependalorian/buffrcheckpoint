"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { List, ListRow } from "@/components/ui/list";
import { NativeSelect } from "@/components/ui/native-select";

import { bulkReviewPaymentAction } from "../actions";
import { ReviewButtons } from "./review-buttons";

export interface BillingQueueRow {
  id: string;
  title: string;
  href: string;
  subtitle: string | null;
  documentHref: string | null;
}

export function BillingBulkQueue({ rows }: { rows: BillingQueueRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [decision, setDecision] = useState<"" | "confirmed" | "rejected">("");
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
    if (selected.size === 0 || !decision) return;
    const ids = [...selected];
    startTransition(async () => {
      const result = await bulkReviewPaymentAction(ids, decision);
      if ("error" in result) {
        setFeedback(result.error);
        return;
      }
      setFeedback(
        result.failed.length === 0
          ? `${result.updated} marked ${decision}.`
          : `${result.updated} of ${result.requested} updated. ${result.failed.length} failed.`,
      );
      setSelected(new Set());
      setDecision("");
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
          value={decision}
          disabled={selected.size === 0 || pending}
          onChange={(event) => setDecision(event.target.value as "" | "confirmed" | "rejected")}
          aria-label="Bulk review decision"
        >
          <option value="">Move selected to…</option>
          <option value="confirmed">confirmed</option>
          <option value="rejected">rejected</option>
        </NativeSelect>
        <Button size="sm" variant="outline" disabled={selected.size === 0 || !decision || pending} onClick={apply}>
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
                <Link href={row.href} className="text-foreground text-sm hover:underline">
                  {row.title}
                </Link>
                {row.subtitle ? <p className="text-muted-foreground text-xs">{row.subtitle}</p> : null}
                {row.documentHref ? (
                  <a href={row.documentHref} className="text-xs hover:underline">
                    Download POP
                  </a>
                ) : null}
              </div>
            </div>
            <ReviewButtons paymentTransactionId={row.id} />
          </ListRow>
        ))}
      </List>
    </div>
  );
}
