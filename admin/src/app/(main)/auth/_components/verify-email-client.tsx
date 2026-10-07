"use client";

import { useRef, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authCopy } from "@/lib/copy/auth";

type VerifyState = "ready" | "loading" | "success" | "error";
type VerifyResult = { ok: false } | { ok: true; nextPath: string };

async function consumeToken(token: string): Promise<VerifyResult> {
  try {
    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) return { ok: false };
    const result = (await response.json()) as { nextPath?: string };
    return { ok: true, nextPath: result.nextPath ?? "/onboarding" };
  } catch {
    return { ok: false };
  }
}

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  // The link only opens this page. The token is spent when the person presses the button, so a mail scanner that fetches or renders
  // the link cannot verify an address on their behalf.
  const [state, setState] = useState<VerifyState>(token ? "ready" : "error");
  const [nextPath, setNextPath] = useState("/onboarding");
  // Tokens are single-use: Strict Mode and re-renders re-run the effect, so
  // every run awaits the one request already sent for this token.
  const request = useRef<{ token: string; promise: Promise<VerifyResult> } | null>(null);

  function confirm() {
    if (!token) return;
    setState("loading");
    if (request.current?.token !== token) {
      request.current = { token, promise: consumeToken(token) };
    }
    request.current.promise.then((result) => {
      if (!result.ok) {
        setState("error");
        return;
      }
      setNextPath(result.nextPath);
      setState("success");
    });
  }

  if (state === "ready") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">{authCopy.verifyEmail.confirmDescription}</p>
        <Button className="w-full" onClick={confirm}>
          {authCopy.verifyEmail.confirm}
        </Button>
      </div>
    );
  }

  if (state === "loading") {
    return <p className="text-muted-foreground text-sm">{authCopy.verifyEmail.title}</p>;
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">{authCopy.verifyEmail.expiredDescription}</p>
        <Button asChild className="w-full">
          <Link href="/auth/check-email">{authCopy.verifyEmail.requestNew}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{authCopy.verifyEmail.successDescription}</p>
      <Button className="w-full" onClick={() => router.push(nextPath)}>
        {authCopy.verifyEmail.continue}
      </Button>
    </div>
  );
}
