import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/auth/me";
import { onboardingCopy } from "@/lib/copy/onboarding";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }
  if (!currentUser.user.emailVerified) {
    redirect("/auth/check-email");
  }
  if (!currentUser.user.mfaEnabled) {
    redirect("/auth/mfa/setup");
  }
  if (currentUser.onboarding?.complete) {
    redirect("/dashboard/overview");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <p className="text-muted-foreground text-sm">{currentUser.activeOrganisation.name}</p>
        <h1 className="font-heading text-2xl tracking-tight">{onboardingCopy.shellTitle}</h1>
        <p className="text-muted-foreground text-sm">{onboardingCopy.shellDescription}</p>
        <p className="text-muted-foreground text-xs">{onboardingCopy.goLiveBlocked}</p>
      </header>
      {children}
    </div>
  );
}
