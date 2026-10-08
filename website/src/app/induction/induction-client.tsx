"use client";

import { useCallback, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiBaseUrl } from "@/lib/api";
import { formatNoticeDate, siteNoticesCopy } from "@/lib/copy/site-notices";

import { CheckInShell } from "../check-in/check-in-shell";

interface Induction {
  siteName: string;
  available: boolean;
  policyVersionId: string | null;
  contentText: string | null;
  versionNumber: number | null;
  updatedAt: string | null;
}

type State = { kind: "loading" } | { kind: "invalid" } | { kind: "ready"; induction: Induction };

export default function InductionClient() {
  const params = useSearchParams();
  const siteId = params.get("site")?.trim() ?? "";
  const referenceId = params.get("ref")?.trim() ?? "";
  const copy = siteNoticesCopy.induction;
  const [state, setState] = useState<State>(siteId && referenceId ? { kind: "loading" } : { kind: "invalid" });
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async (): Promise<State> => {
    try {
      const res = await fetch(
        `${apiBaseUrl()}/public/induction?site=${encodeURIComponent(siteId)}&ref=${encodeURIComponent(referenceId)}`,
      );
      if (!res.ok) return { kind: "invalid" };
      return { kind: "ready", induction: (await res.json()) as Induction };
    } catch {
      return { kind: "invalid" };
    }
  }, [siteId, referenceId]);

  useEffect(() => {
    if (!siteId || !referenceId) return;
    let cancelled = false;
    void load().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [siteId, referenceId, load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state.kind !== "ready" || !state.induction.policyVersionId) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl()}/public/induction/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          referenceId,
          visitorPhone: phone.trim(),
          policyVersionId: state.induction.policyVersionId,
        }),
      });
      if (res.status === 409) {
        // The text changed while it was being read: show the new version and clear the tick so it is read again.
        setConfirmed(false);
        setState(await load());
        setMessage({ tone: "info", text: copy.changed });
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
        const text = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
        setMessage({ tone: "error", text: text || copy.failed });
        return;
      }
      const result = (await res.json()) as { repeated: boolean };
      setDone(true);
      setMessage({ tone: "ok", text: result.repeated ? copy.doneRepeat : copy.done });
    } catch {
      setMessage({ tone: "error", text: copy.failed });
    } finally {
      setSubmitting(false);
    }
  }

  const ready = state.kind === "ready" ? state.induction : null;
  const canSubmit = Boolean(ready?.available && phone.trim().length >= 7 && confirmed && !submitting && !done);

  return (
    <CheckInShell label={copy.shellLabel}>
      <div className="space-y-4">
        <h1 className="font-semibold text-2xl tracking-tight text-foreground">{copy.title}</h1>
        {state.kind === "loading" ? <p className="text-sm text-muted-foreground">{copy.loading}</p> : null}
        {state.kind === "invalid" ? (
          <p className="text-sm text-foreground" role="alert">
            {copy.invalidLink}
          </p>
        ) : null}
        {ready ? <p className="text-sm text-muted-foreground">{copy.siteLine(ready.siteName)}</p> : null}
        {ready && !ready.available ? <p className="text-sm text-foreground">{copy.notPublished}</p> : null}
        {ready?.available && ready.contentText ? (
          <>
            <div className="whitespace-pre-line text-base leading-relaxed text-foreground">{ready.contentText}</div>
            {ready.versionNumber ? (
              <p className="text-muted-foreground text-xs">
                {copy.updated(ready.versionNumber, formatNoticeDate(ready.updatedAt))}
              </p>
            ) : null}
            <form onSubmit={submit} className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="inductionPhone">{copy.phoneLabel}</Label>
                <Input
                  id="inductionPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  minLength={7}
                  maxLength={40}
                  placeholder="+264..."
                  required
                  disabled={done}
                />
                <p className="text-muted-foreground text-xs">{copy.phoneHelp}</p>
              </div>
              <label className="flex items-start gap-3 text-sm text-foreground" htmlFor="inductionConfirm">
                <input
                  id="inductionConfirm"
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={done}
                />
                <span>{copy.confirm}</span>
              </label>
              <Button type="submit" disabled={!canSubmit} className="w-full">
                {submitting ? copy.saving : copy.submit}
              </Button>
            </form>
          </>
        ) : null}
        {message ? (
          <p
            className="rounded-md border p-3 text-sm"
            role={message.tone === "error" ? "alert" : "status"}
            style={{ borderColor: message.tone === "error" ? "var(--color-carbon)" : "var(--color-sodium-yellow)" }}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </CheckInShell>
  );
}
