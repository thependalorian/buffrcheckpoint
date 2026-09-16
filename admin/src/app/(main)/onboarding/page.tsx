import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/me";
import { STEP_CODE_TO_SLUG } from "@/lib/copy/onboarding";

export default async function OnboardingIndexPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }
  const step = currentUser.onboarding?.currentStep ?? "organisation_profile";
  const slug = STEP_CODE_TO_SLUG[step as keyof typeof STEP_CODE_TO_SLUG] ?? "organisation-profile";
  redirect(`/onboarding/${slug}`);
}
