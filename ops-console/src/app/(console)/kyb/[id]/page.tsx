import Link from "next/link";

import { DashboardErrorState } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { apiFetch, loadOrError } from "@/lib/api";

import { type KybReview, ReviewPanel } from "./_components/review-panel";

export default async function KybReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadOrError(() => apiFetch<KybReview>(`/platform/kyb/submissions/${id}/review`));

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <Link href="/kyb" className="text-muted-foreground text-xs hover:underline">
          Back to the queue
        </Link>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }
  const review = result.data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/kyb" className="text-muted-foreground text-xs hover:underline">
          Back to the queue
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-heading font-light text-2xl text-foreground">{review.registeredBusinessName}</h1>
          <Badge variant={review.status === "verified" ? "default" : "secondary"}>{review.statusLabel}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {review.organisationName ?? "Organisation"} · submitted{" "}
          {new Date(review.submittedAt).toLocaleDateString("en-GB")}
          {review.entityTypeLabel ? ` · ${review.entityTypeLabel}` : ""}
        </p>
      </div>
      <ReviewPanel review={review} />
    </div>
  );
}
