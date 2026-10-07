"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { notificationPrefsCopy as copy, emailAudience, emailName } from "@/lib/copy/notifications";

import { type EmailPreference, savePreferencesAction } from "../actions";

/** The rows whose switch differs from what is saved. */
export function changedPreferences(saved: EmailPreference[], draft: Record<string, boolean>) {
  return saved
    .filter((row) => draft[row.templateCode] !== row.enabled)
    .map((row) => ({ templateCode: row.templateCode, enabled: draft[row.templateCode] }));
}

export function PreferencesForm({ initial }: { initial: EmailPreference[] }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Record<string, boolean>>(
    Object.fromEntries(initial.map((r) => [r.templateCode, r.enabled])),
  );
  const [pending, startTransition] = useTransition();
  const changes = changedPreferences(saved, draft);

  function save() {
    startTransition(async () => {
      const result = await savePreferencesAction(changes);
      if (!result.ok) {
        toast.error(result.message || copy.saveFailed);
        return;
      }
      setSaved(result.data);
      setDraft(Object.fromEntries(result.data.map((r) => [r.templateCode, r.enabled])));
      toast.success(copy.saved);
    });
  }

  if (saved.length === 0) return <p className="text-muted-foreground text-sm">{copy.empty}</p>;

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border border-border">
        {saved.map((row) => {
          const id = `pref-${row.templateCode}`;
          return (
            <li key={row.templateCode} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="max-w-xl">
                <Label htmlFor={id} className="font-medium">
                  {emailName(row.templateCode)}
                </Label>
                <p className="text-muted-foreground text-sm">
                  {copy.columns.sentWhen}: {row.trigger.toLowerCase()}.
                </p>
                <p className="text-muted-foreground text-sm">
                  {copy.columns.to}: {emailAudience(row.audience, row.channel)}.
                </p>
              </div>
              <Switch
                id={id}
                aria-label={copy.switchLabel(emailName(row.templateCode))}
                checked={draft[row.templateCode] ?? row.enabled}
                onCheckedChange={(checked) => setDraft((current) => ({ ...current, [row.templateCode]: checked }))}
                disabled={pending}
              />
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-sm">{copy.note}</p>
      {saved.some((row) => row.channel === "sms") ? (
        <p className="text-muted-foreground text-sm">{copy.smsNote}</p>
      ) : null}
      <Button onClick={save} disabled={pending || changes.length === 0}>
        {copy.save}
      </Button>
    </div>
  );
}
