import { Skeleton } from "@/components/ui/skeleton";

// Route-level loading.tsx for every dashboard list page renders this while
// its Server Component awaits the backend — a shape that reads as "a table
// is arriving," not a generic spinner that could be mistaken for the page
// itself being broken.
export function DashboardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-2 rounded-md border p-4">
        <Skeleton className="h-6 w-full" />
        {Array.from({ length: rows }, (_, i) => (
          // Static skeleton rows, not data — index as key is fine here.
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows, never reordered
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
