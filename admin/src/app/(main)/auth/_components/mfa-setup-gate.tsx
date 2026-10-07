"use client";

import { Button } from "@/components/ui/button";
import { useBuffrIdConfig } from "@/lib/auth/use-buffr-id-config";
import { authCopy } from "@/lib/copy/auth";

import { MfaSetupForm } from "./mfa-setup-form";

/** With Buffr ID on, two-step sign-in is set up in Buffr ID. The old in-app enrolment stays for deployments without it. */
export function MfaSetupGate() {
  const buffrId = useBuffrIdConfig();
  if (!buffrId.loaded) return <p className="text-muted-foreground text-sm">Loading...</p>;
  if (!buffrId.enabled || !buffrId.issuer) return <MfaSetupForm />;
  return (
    <div className="flex flex-col gap-4">
      <p className="font-medium text-sm">{authCopy.buffrId.securityTitle}</p>
      <p className="text-muted-foreground text-sm">{authCopy.buffrId.securityDescription}</p>
      <Button asChild className="w-full">
        <a href={`${buffrId.issuer}/security`}>{authCopy.buffrId.securityLink}</a>
      </Button>
    </div>
  );
}
