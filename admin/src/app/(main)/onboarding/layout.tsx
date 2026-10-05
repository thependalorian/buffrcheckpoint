import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getSessionGate } from "@/lib/auth/me";
import { onboardingCopy } from "@/lib/copy/onboarding";

import { NavigationTimer } from "./_components/step-actions";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const gate = await getSessionGate();
  if (!gate) {
    redirect("/auth/login");
  }
  if (!gate.emailVerified) {
    redirect("/auth/check-email");
  }
  if (!gate.mfaEnabled) {
    redirect("/auth/mfa/setup");
  }
  if (gate.onboardingComplete) {
    redirect("/dashboard/overview");
  }
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      {gate.canManageOnboarding ? (
        <header>
          <h1 className="text-muted-foreground text-sm">
            {gate.organisationName} · {onboardingCopy.shellTitle}
          </h1>
        </header>
      ) : null}
      <NavigationTimer />
      {children}
    </div>
  );
}
