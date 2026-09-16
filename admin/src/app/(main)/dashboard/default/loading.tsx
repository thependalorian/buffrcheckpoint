import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          // Static skeleton cards, not data — index as key is fine here.
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cards, never reordered
          <Card key={i}>
            <CardHeader>
              <Skeleton className="mb-2 size-7 rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
