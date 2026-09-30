"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiBaseUrl } from "@/lib/api";
import { AnalyticsEvents, track } from "@/lib/observability/track";

import { CheckInBrandedShell } from "../check-in/check-in-branded-shell";

export default function CheckOutClient() {
  const params = useSearchParams();
  const siteId = params.get("site")?.trim() || "";
  const referenceId = params.get("ref")?.trim() || "";
  const [visitorPhone, setVisitorPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    confirmationCode: string;
    siteName: string;
    checkedOutAt: string;
  } | null>(null);

  const canSubmit = useMemo(
    () => siteId.length > 0 && referenceId.length > 0 && visitorPhone.trim().length >= 7,
    [siteId, referenceId, visitorPhone],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      toast.error("Open this page from a site QR link, and enter the phone used at check-in.");
      return;
    }
    setSubmitting(true);
    track(AnalyticsEvents.checkOutStarted);
    try {
      const res = await fetch(`${apiBaseUrl()}/public/check-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          referenceId,
          visitorPhone: visitorPhone.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
        const message = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message || "Sign-out failed. See reception.";
        throw new Error(message);
      }
      const data = (await res.json()) as {
        confirmationCode: string;
        siteName?: string;
        checkedOutAt: string;
        remainingOpenVisits?: number;
        message?: string;
      };
      setDone({
        confirmationCode: data.confirmationCode,
        siteName: data.siteName || "this site",
        checkedOutAt: data.checkedOutAt,
      });
      track(AnalyticsEvents.checkOutCompleted);
      toast.success(data.message || "Signed out.");
    } catch (error) {
      track(AnalyticsEvents.checkOutFailed);
      toast.error(error instanceof Error ? error.message : "Sign-out failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!siteId || !referenceId) {
    return (
      <CheckInBrandedShell branding={null} siteNameFallback="Visitor sign-out">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Sign-out link incomplete</h1>
          <p className="text-sm text-muted-foreground">
            Scan the site QR again, or ask reception to check you out from the front desk.
          </p>
        </div>
      </CheckInBrandedShell>
    );
  }

  if (done) {
    return (
      <CheckInBrandedShell branding={null} siteNameFallback={done.siteName}>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#3D1152" }}>
            You are signed out
          </h1>
          <p className="text-sm" style={{ color: "#705C67" }}>
            Confirmation {done.confirmationCode} · {new Date(done.checkedOutAt).toLocaleString()}
          </p>
          <p className="text-sm" style={{ color: "#705C67" }}>
            Return your visitor pass to reception if you were issued one.
          </p>
        </div>
      </CheckInBrandedShell>
    );
  }

  return (
    <CheckInBrandedShell branding={null} siteNameFallback="Visitor sign-out">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#3D1152" }}>
            Sign out
          </h1>
          <p className="text-sm" style={{ color: "#705C67" }}>
            Enter the mobile number you used at check-in. This does not show a visitor directory.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="visitorPhone">Mobile phone</Label>
          <Input
            id="visitorPhone"
            type="tel"
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
            required
            minLength={7}
            maxLength={40}
            placeholder="+264…"
          />
        </div>
        <Button type="submit" disabled={!canSubmit || submitting} className="w-full">
          {submitting ? "Signing out…" : "Sign out"}
        </Button>
      </form>
    </CheckInBrandedShell>
  );
}
