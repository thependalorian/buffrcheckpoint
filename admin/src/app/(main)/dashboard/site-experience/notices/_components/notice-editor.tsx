"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { siteNoticesAdminCopy as copy } from "@/lib/copy/site-notices";

import { loadNoticeAction, type PublishedNotice, publishNoticeAction } from "../actions";

interface Props {
  kind: "emergency" | "induction";
  sites: ReadonlyArray<{ id: string; name: string }>;
  initial: PublishedNotice | null;
}

function when(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function NoticeEditor({ kind, sites, initial }: Props) {
  const section = copy[kind];
  const [siteId, setSiteId] = useState("");
  const [text, setText] = useState(initial?.contentText ?? "");
  const [published, setPublished] = useState<PublishedNotice | null>(initial);
  const [pending, startTransition] = useTransition();
  const fieldId = `notice-${kind}`;

  function changeSite(next: string) {
    setSiteId(next);
    startTransition(async () => {
      const result = await loadNoticeAction(kind, next);
      if (!result.ok) {
        toast.error(result.message || copy.loadFailed);
        return;
      }
      setPublished(result.data);
      // A site without its own text starts from the all-sites text, so the editor is never blank by surprise.
      setText(result.data?.contentText ?? "");
    });
  }

  function save() {
    startTransition(async () => {
      const result = await publishNoticeAction(kind, siteId, text);
      if (!result.ok) {
        toast.error(result.message || copy.saveFailed);
        return;
      }
      setPublished(result.data);
      toast.success(copy.saved);
    });
  }

  return (
    <section className="space-y-4 rounded-lg border border-border p-4" aria-labelledby={`${fieldId}-heading`}>
      <div>
        <h2 id={`${fieldId}-heading`} className="font-medium text-lg">
          {section.heading}
        </h2>
        <p className="text-muted-foreground text-sm">{section.help}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-site`}>{copy.siteLabel}</Label>
        <NativeSelect
          id={`${fieldId}-site`}
          value={siteId}
          onChange={(event) => changeSite(event.target.value)}
          disabled={pending}
        >
          <option value="">{copy.allSites}</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </NativeSelect>
        <p className="text-muted-foreground text-xs">{copy.siteHelp}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={fieldId}>{copy.textLabel}</Label>
        <Textarea
          id={fieldId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={10}
          maxLength={20000}
          placeholder={section.placeholder}
          disabled={pending}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={pending || text.trim().length < 20}>
          {pending ? copy.saving : copy.save}
        </Button>
        <p className="text-muted-foreground text-sm" role="status">
          {published
            ? copy.published(published.versionNumber, published.siteSpecific, when(published.publishedAt))
            : copy.nothingPublished}
        </p>
      </div>
    </section>
  );
}
