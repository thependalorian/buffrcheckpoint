"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Building2, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBuffrIdConfig } from "@/lib/auth/use-buffr-id-config";
import { authCopy } from "@/lib/copy/auth";
import { AnalyticsEvents, track } from "@/lib/observability/track";

const SECTOR_OPTIONS = [
  { code: "sme", label: "SME / corporate office" },
  { code: "bank", label: "Bank / financial institution" },
  { code: "government", label: "Government / public office" },
  { code: "healthcare", label: "Healthcare" },
  { code: "critical_infrastructure", label: "Critical infrastructure" },
  { code: "education", label: "Education / academic institution" },
  { code: "hospitality_tourism", label: "Hospitality / tourism" },
  { code: "retail_trade", label: "Retail / trade" },
  { code: "manufacturing", label: "Manufacturing / industrial" },
  { code: "agriculture", label: "Agriculture / agro-processing" },
  { code: "mining_energy", label: "Mining / energy" },
  { code: "transport_logistics", label: "Transport / logistics" },
  { code: "telecom_ict", label: "Telecom / ICT" },
  { code: "real_estate", label: "Real estate / property management" },
  { code: "professional_services", label: "Professional / consulting services" },
  { code: "ngo_nonprofit", label: "NGO / non-profit" },
  { code: "construction", label: "Construction" },
  { code: "media_entertainment", label: "Media / entertainment" },
  { code: "religious_faith_based", label: "Religious / faith-based organisation" },
  { code: "other", label: "Other" },
];

export function RegisterForm() {
  const router = useRouter();
  const buffrId = useBuffrIdConfig();
  const urlError = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("error");
  const [organisationName, setOrganisationName] = useState("");
  const [sectorCode, setSectorCode] = useState(SECTOR_OPTIONS[0].code);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Honeypot: hidden from people, filled in by bots. The API refuses a sign-up that has it.
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (buffrId.enabled) {
      // New organisations are created from a Buffr ID sign-in; the organisation details travel in the start request.
      const params = new URLSearchParams({ intent: "register", org: organisationName, sector: sectorCode });
      window.location.assign(`/api/auth/buffr-id/start?${params.toString()}`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationName, sectorCode, email, password, website }),
      });
      const result = await response.json();
      if (!response.ok) {
        track(AnalyticsEvents.registerFailed, { status: response.status });
        setError(result.error ?? authCopy.errors.generic);
        return;
      }
      track(AnalyticsEvents.registerSucceeded, { sector_code: sectorCode });
      const params = new URLSearchParams({ email });
      router.push(`/auth/check-email?${params.toString()}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="organisationName">Organisation name</Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="organisationName"
            required
            value={organisationName}
            onChange={(event) => setOrganisationName(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sectorCode">Sector</Label>
        <Select value={sectorCode} onValueChange={setSectorCode}>
          <SelectTrigger id="sectorCode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTOR_OPTIONS.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {buffrId.enabled ? (
        <p className="text-muted-foreground text-sm">{authCopy.buffrId.registerNote}</p>
      ) : (
        <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pl-8"
          />
        </div>
        <p className="text-muted-foreground text-xs">At least 8 characters.</p>
      </div>
        </>
      )}
      {urlError && authCopy.buffrId.errors[urlError] ? <p className="text-destructive text-sm">{authCopy.buffrId.errors[urlError]}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={submitting} className="w-full">
        {buffrId.enabled ? authCopy.buffrId.registerContinue : submitting ? authCopy.register.submitting : authCopy.register.submit}
      </Button>
      <p className="text-center text-muted-foreground text-sm">
        {authCopy.register.haveAccount}{" "}
        <Link href="/auth/login" className="text-sodium-yellow-ink underline-offset-4 hover:underline">
          {authCopy.register.signIn}
        </Link>
      </p>
    </form>
  );
}
