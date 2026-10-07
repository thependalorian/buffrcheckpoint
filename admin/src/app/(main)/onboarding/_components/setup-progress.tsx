import { onboardingCopy } from "@/lib/copy/onboarding";
import { cn } from "@/lib/utils";

/** An honest count as one flat segment per step: filled for done, hairline for open. Never padded, never a percentage. */
export function SetupProgress({ done, total }: { done: number; total: number }) {
  const label = onboardingCopy.home.progress(done, total);
  return (
    <div className="space-y-2">
      <p className="font-medium text-sm" aria-live="polite">
        {label}
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="flex max-w-sm gap-1.5"
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            // Segments are positional and never reorder.
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative segments
            key={index}
            className={cn("h-1.5 flex-1 rounded-sm", index < done ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>
    </div>
  );
}
