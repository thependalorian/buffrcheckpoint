"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { QrCodeImage } from "@/components/qr-code-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authCopy } from "@/lib/copy/auth";

export function MfaSetupForm() {
  const router = useRouter();
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/auth/mfa/enroll/start", { method: "POST" });
      if (!response.ok) {
        if (!cancelled) setError(authCopy.errors.generic);
        return;
      }
      const result = (await response.json()) as { otpauthUrl: string; secret: string };
      if (!cancelled) {
        setOtpauthUrl(result.otpauthUrl);
        setSecret(result.secret);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/mfa/enroll/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.replace(/[\s\-]/g, "") }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? authCopy.errors.generic);
        return;
      }
      setRecoveryCodes(result.recoveryCodes as string[]);
    } finally {
      setSubmitting(false);
    }
  }

  if (recoveryCodes) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">{authCopy.mfaSetup.recoveryDescription}</p>
        <ul className="grid grid-cols-2 gap-2 rounded-md border p-3 font-mono text-sm">
          {recoveryCodes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Button className="w-full" onClick={() => router.push("/onboarding")}>
          {authCopy.mfaSetup.continueOnboarding}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{authCopy.mfaSetup.description}</p>
      {otpauthUrl ? (
        <div className="flex flex-col items-center gap-3 rounded-md border bg-muted/40 p-4">
          <QrCodeImage value={otpauthUrl} size={200} alt="Authenticator QR code" />
          <p className="text-center text-muted-foreground text-xs">{authCopy.mfaSetup.scanHint}</p>
          <button
            type="button"
            className="text-sodium-yellow-ink text-xs underline-offset-4 hover:underline"
            onClick={() => setShowManual((value) => !value)}
          >
            {showManual ? authCopy.mfaSetup.hideManual : authCopy.mfaSetup.showManual}
          </button>
          {showManual && secret ? (
            <div className="w-full space-y-2 break-all text-xs">
              <div>
                <p className="mb-1 font-medium">{authCopy.mfaSetup.secretLabel}</p>
                <p className="font-mono tracking-wide">{secret}</p>
              </div>
              <div>
                <p className="mb-1 font-medium">{authCopy.mfaSetup.otpauthLabel}</p>
                <p className="text-muted-foreground">{otpauthUrl}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{authCopy.mfaSetup.preparing}</p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">{authCopy.mfaSetup.codeLabel}</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          minLength={6}
          maxLength={12}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^\d\s-]/g, ""))}
          placeholder="000000"
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={submitting || !otpauthUrl} className="w-full">
        {submitting ? authCopy.mfaSetup.confirming : authCopy.mfaSetup.confirm}
      </Button>
    </form>
  );
}
