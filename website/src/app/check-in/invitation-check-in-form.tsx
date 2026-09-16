"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiBaseUrl, newClientId } from "@/lib/api";

type InvitationContext = {
  invitationId: string;
  siteId: string;
  siteName: string;
  hostId: string;
  visitorCategoryCode: string;
};

type Props = {
  invitationToken: string;
};

export function InvitationCheckInForm({ invitationToken }: Props) {
  const [context, setContext] = useState<InvitationContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [visitorName, setVisitorName] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const url = `${apiBaseUrl()}/public/invitations/resolve?token=${encodeURIComponent(invitationToken)}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("This invitation is not valid or has expired.");
        }
        const data = (await res.json()) as InvitationContext;
        if (!cancelled) setContext(data);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load invitation.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [invitationToken]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!context || !visitorName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/public/check-in/invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newClientId(),
          token: invitationToken,
          visitorName: visitorName.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error("Check-in could not be completed.");
      }
      setDone(true);
      toast.success("Check-in recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading invitation…</p>;
  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;
  if (done) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Check-in recorded</h1>
        <p className="text-sm text-muted-foreground">Thank you. Please proceed to reception.</p>
      </div>
    );
  }
  if (!context) return null;

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invitation check-in</h1>
        <p className="mt-1 text-sm text-muted-foreground">{context.siteName}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="visitorName">Your name</Label>
        <Input
          id="visitorName"
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>
      <Button type="submit" disabled={submitting || !visitorName.trim()}>
        {submitting ? "Submitting…" : "Check in"}
      </Button>
    </form>
  );
}
