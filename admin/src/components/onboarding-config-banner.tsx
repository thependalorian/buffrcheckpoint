import Link from "next/link";

import { onboardingCopy } from "@/lib/copy/onboarding";

export function OnboardingConfigBanner({ nextPath }: { nextPath: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="text-foreground">{onboardingCopy.banner.message}</p>
      <Link href={nextPath} prefetch={false} className="font-medium text-foreground underline underline-offset-4">
        {onboardingCopy.backToOnboarding}
      </Link>
    </div>
  );
}
