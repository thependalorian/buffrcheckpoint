import { redirect } from "next/navigation";

import { getSessionGate } from "@/lib/auth/me";
import { onboardingCopy } from "@/lib/copy/onboarding";

import { WaitingActions } from "./waiting-actions";

/** Invited staff wait here with a purpose (§11.9.15.8): never a dead end, never a setup step they cannot do. */
export default async function OnboardingWaitingPage() {
  const gate = await getSessionGate();
  if (!gate) redirect("/auth/login");
  const copy = onboardingCopy.waiting;
  return (
    <section className="bc-panel max-w-xl space-y-4">
      <h2 className="font-heading text-xl">{copy.title}</h2>
      <div className="space-y-1 text-sm">
        <p>{copy.notReady(gate.organisationName)}</p>
        <p className="text-muted-foreground">{copy.owner}</p>
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-medium">{copy.nextTitle}</p>
        <ol className="list-decimal pl-5 text-muted-foreground">
          {copy.next.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
      <WaitingActions />
      <p className="text-muted-foreground text-sm">{copy.help}</p>
    </section>
  );
}
