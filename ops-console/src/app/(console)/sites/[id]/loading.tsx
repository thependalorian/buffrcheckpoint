import { Skeleton } from "@/components/ui/skeleton";

export default function SiteDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="mt-6 h-48 w-full rounded-xl" />
    </div>
  );
}
