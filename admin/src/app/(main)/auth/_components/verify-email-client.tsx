"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authCopy } from "@/lib/copy/auth";

type VerifyState = "loading" | "success" | "error";
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
    return { ok: true, nextPath: result.nextPath ?? "/auth/mfa/setup" };
  } catch {
    return { ok: false };
  }
}

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<VerifyState>(token ? "loading" : "error");
  const [nextPath, setNextPath] = useState("/auth/mfa/setup");
  // Tokens are single-use: Strict Mode and re-renders re-run the effect, so
  // every run awaits the one request already sent for this token.
  const request = useRef<{ token: string; promise: Promise<VerifyResult> } | null>(null);

  useEffect(() => {
    if (!token) return;
    if (request.current?.token !== token) {
      request.current = { token, promise: consumeToken(token) };
    }
    let cancelled = false;
    request.current.promise.then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState("error");
        return;
      }
      setNextPath(result.nextPath);
      setState("success");
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

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
