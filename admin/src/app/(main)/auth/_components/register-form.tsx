"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Building2, Lock, Mail } from "lucide-react";

import { TurnstileWidget, turnstileEnabled } from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBuffrIdConfig } from "@/lib/auth/use-buffr-id-config";
import { authCopy, PASSWORD_MIN_LENGTH, passwordRule } from "@/lib/copy/auth";
import { LEGAL_LINKS } from "@/lib/legal-links";
import { AnalyticsEvents, track } from "@/lib/observability/track";
import { useOrganisationSectors } from "@/lib/use-organisation-sectors";

export function RegisterForm() {
  const router = useRouter();
  const buffrId = useBuffrIdConfig();
  const urlError = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("error");
  const [organisationName, setOrganisationName] = useState("");
  const { sectors, loaded: sectorsLoaded } = useOrganisationSectors();
  const [chosenSector, setChosenSector] = useState<string | null>(null);
  // The first configured sector until the person picks one.
  const sectorCode = chosenSector ?? sectors[0].code;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Honeypot: hidden from people, filled in by bots. The API refuses a sign-up that has it.
  const [website, setWebsite] = useState("");
  // Creating an account is acceptance of the Terms and the Privacy Policy, so it is never pre-ticked.
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError(authCopy.register.terms.required);
      return;
    }
    if (buffrId.enabled) {
      // New organisations are created from a Buffr ID sign-in; the organisation details travel in the start request.
      const params = new URLSearchParams({ intent: "register", org: organisationName, sector: sectorCode, terms: "1" });
      window.location.assign(`/api/auth/buffr-id/start?${params.toString()}`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(turnstileToken ? { "x-turnstile-token": turnstileToken } : {}),
        },
        body: JSON.stringify({ organisationName, sectorCode, email, password, website, acceptTerms }),
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
      setTurnstileReset((n) => n + 1);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
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
        <Select value={sectorCode} onValueChange={setChosenSector} disabled={!sectorsLoaded}>
          <SelectTrigger id="sectorCode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sectors.map((option) => (
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
                minLength={PASSWORD_MIN_LENGTH}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-8"
              />
            </div>
            <p className="text-muted-foreground text-xs">{passwordRule}</p>
          </div>
        </>
      )}
      <div className="flex items-start gap-2.5">
        <Checkbox
          id="acceptTerms"
          checked={acceptTerms}
          onCheckedChange={(checked) => setAcceptTerms(checked === true)}
          aria-describedby="acceptTermsText"
          className="mt-0.5"
        />
        <Label id="acceptTermsText" htmlFor="acceptTerms" className="font-normal text-sm leading-snug">
          {authCopy.register.terms.agree}{" "}
          <a
            href={LEGAL_LINKS.terms}
            target="_blank"
            rel="noreferrer"
            className="text-sodium-yellow-ink underline underline-offset-4"
          >
            {authCopy.register.terms.termsLink}
          </a>{" "}
          {authCopy.register.terms.and}{" "}
          <a
            href={LEGAL_LINKS.privacy}
            target="_blank"
            rel="noreferrer"
            className="text-sodium-yellow-ink underline underline-offset-4"
          >
            {authCopy.register.terms.privacyLink}
          </a>
          .
        </Label>
      </div>
      {urlError && authCopy.buffrId.errors[urlError] ? (
        <p className="text-destructive text-sm">{authCopy.buffrId.errors[urlError]}</p>
      ) : null}
      <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileReset} />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={submitting || (turnstileEnabled && !turnstileToken)} className="w-full">
        {buffrId.enabled
          ? authCopy.buffrId.registerContinue
          : submitting
            ? authCopy.register.submitting
            : authCopy.register.submit}
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
