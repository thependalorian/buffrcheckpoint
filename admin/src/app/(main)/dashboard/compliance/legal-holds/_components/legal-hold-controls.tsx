"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { createLegalHoldAction, releaseLegalHoldAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function CreateLegalHoldSheet() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">New legal hold</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create legal hold</SheetTitle>
          <SheetDescription>
            Freezes deletion/retention for the scope you define until the hold is released.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              try {
                await createLegalHoldAction({
                  reason: String(formData.get("reason") ?? "").trim(),
                  scopeJson: String(formData.get("scopeJson") ?? "{}").trim(),
                });
                setOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create legal hold");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" required placeholder="Litigation hold — matter ref" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scopeJson">Scope (JSON)</Label>
            <textarea
              id="scopeJson"
              name="scopeJson"
              required
              defaultValue='{"siteId":"","dateRangeStart":"","dateRangeEnd":""}'
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs"
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create hold"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function ReleaseLegalHoldButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          const reason = window.prompt("Reason for releasing this legal hold");
          if (!reason?.trim()) return;
          setError(null);
          startTransition(async () => {
            try {
              await releaseLegalHoldAction({ id, reason: reason.trim() });
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Release failed");
            }
          });
        }}
      >
        {isPending ? "Releasing…" : "Release"}
      </Button>
      {error ? <p className="mt-1 text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
