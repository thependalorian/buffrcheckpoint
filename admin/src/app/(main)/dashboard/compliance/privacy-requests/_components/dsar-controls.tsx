"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { privacyRequestsCopy } from "@/lib/copy/privacy-requests";

import { createDsarAction, extendDsarAction, resolveDsarAction } from "../actions";

const REQUEST_TYPES = [
  { value: "data_export", label: "Data export" },
  { value: "correction", label: "Correction" },
  { value: "account_deletion", label: "Account deletion" },
] as const;

export function CreateDsarSheet() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">New privacy request</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New privacy request</SheetTitle>
          <SheetDescription>
            Log a DSAR for a visitor subject reference or staff email. Account deletion is tracked separately from
            export/correction so Compliance can prioritise it.
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
                await createDsarAction({
                  subjectReference: String(formData.get("subjectReference") ?? "").trim(),
                  requestTypeCode: String(formData.get("requestTypeCode") ?? "data_export"),
                });
                setOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create request.");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="requestTypeCode">Request type</Label>
            <select
              id="requestTypeCode"
              name="requestTypeCode"
              required
              defaultValue="data_export"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subjectReference">Subject reference</Label>
            <Input
              id="subjectReference"
              name="subjectReference"
              required
              placeholder="visitor phone HMAC ref or staff email"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving…" : "Create request"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function DsarTypeFilter({ active }: { active?: string }) {
  const filters = [
    { value: "", label: "All" },
    { value: "account_deletion", label: "Account deletion" },
    { value: "data_export", label: "Data export" },
    { value: "correction", label: "Correction" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const href = filter.value
          ? `/dashboard/compliance/privacy-requests?type=${filter.value}`
          : "/dashboard/compliance/privacy-requests";
        const selected = (active ?? "") === filter.value;
        return (
          <Button key={filter.value || "all"} asChild size="sm" variant={selected ? "default" : "outline"}>
            <a href={href}>{filter.label}</a>
          </Button>
        );
      })}
    </div>
  );
}

export function ResolveDsarButtons({
  id,
  isAccountDeletion,
  statusCode,
}: {
  id: string;
  isAccountDeletion: boolean;
  statusCode: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (statusCode !== "pending") {
    return <Badge variant="secondary">{statusCode}</Badge>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await resolveDsarAction({
                  id,
                  resolution: "completed",
                  reason: isAccountDeletion ? "Account deletion fulfilled" : "DSAR completed",
                });
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Resolve failed");
              }
            })
          }
        >
          {isAccountDeletion ? "Complete deletion" : "Complete"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await resolveDsarAction({
                  id,
                  resolution: "rejected",
                  reason: "Rejected by compliance officer",
                });
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Reject failed");
              }
            })
          }
        >
          Reject
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ExtendDsarControl({ id, canExtend, extended }: { id: string; canExtend: boolean; extended: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (extended) return <span className="text-xs text-muted-foreground">{privacyRequestsCopy.extendedNote}</span>;
  if (!canExtend) return null;
  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {privacyRequestsCopy.extend}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`extend-${id}`} className="text-xs">
        {privacyRequestsCopy.extendReasonLabel}
      </Label>
      <Input
        id={`extend-${id}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={privacyRequestsCopy.extendReasonPlaceholder}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isPending || reason.trim().length < 5}
          onClick={() =>
            startTransition(async () => {
              try {
                await extendDsarAction({ id, reason: reason.trim() });
                setOpen(false);
                setReason("");
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not record the extension.");
              }
            })
          }
        >
          {privacyRequestsCopy.extendConfirm}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          {privacyRequestsCopy.extendCancel}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function RequestTypeBadge({ code, isAccountDeletion }: { code: string; isAccountDeletion: boolean }) {
  if (isAccountDeletion) {
    return (
      <Badge className="border-warning/40 bg-warning-soft text-warning-ink hover:bg-warning-soft">
        Account deletion
      </Badge>
    );
  }
  return <Badge variant="outline">{code.replaceAll("_", " ")}</Badge>;
}
