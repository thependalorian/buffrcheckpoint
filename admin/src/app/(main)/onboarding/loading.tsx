import { Skeleton } from "@/components/ui/skeleton";

/** Immediate feedback while readiness loads (§11.9.15.10: visible within 100 ms). */
export default function OnboardingLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-6 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-1/2 max-w-sm" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-2">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton key={key} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
