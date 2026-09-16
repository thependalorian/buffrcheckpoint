"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type FieldConfig =
  | { name: string; label: string; type: "text" | "number"; placeholder?: string; defaultValue?: string }
  | { name: string; label: string; type: "textarea"; placeholder?: string; defaultValue?: string }
  | {
      name: string;
      label: string;
      type: "select";
      defaultValue?: string;
      options: Array<{ value: string; label: string }>;
    };

interface SiteExperienceFormSheetProps {
  title: string;
  description: string;
  triggerLabel: string;
  fields: FieldConfig[];
  onSubmit: (values: Record<string, string>) => Promise<void>;
}

export function SiteExperienceFormSheet({
  title,
  description,
  triggerLabel,
  fields,
  onSubmit,
}: SiteExperienceFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">{triggerLabel}</Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            const values = Object.fromEntries(formData.entries()) as Record<string, string>;
            startTransition(async () => {
              try {
                await onSubmit(values);
                setOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Request failed.");
              }
            });
          }}
        >
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  name={field.name}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.name}
                  name={field.name}
                  defaultValue={field.defaultValue}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                />
              )}
            </div>
          ))}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving…" : "Save and publish"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
