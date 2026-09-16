"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authCopy } from "@/lib/copy/auth";

type VerifyState = "loading" | "success" | "error";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<VerifyState>(token ? "loading" : "error");
  const [nextPath, setNextPath] = useState("/auth/mfa/setup");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (cancelled) return;
      if (!response.ok) {
        setState("error");
        return;
      }
      const result = (await response.json()) as { nextPath?: string };
      setNextPath(result.nextPath ?? "/auth/mfa/setup");
      setState("success");
    })();
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
