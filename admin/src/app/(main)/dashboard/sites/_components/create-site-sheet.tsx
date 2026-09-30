"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { createSiteAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function CreateSiteSheet() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Add site</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add site</SheetTitle>
          <SheetDescription>Creates a site under your organisation. Hosts and kiosks attach to this site.</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            const name = String(formData.get("name") ?? "");
            startTransition(async () => {
              const result = await createSiteAction({ name });
              if ("error" in result) {
                setError(result.error);
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Site name</Label>
            <Input id="name" name="name" placeholder="Windhoek Head Office" required minLength={2} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving…" : "Create site"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
