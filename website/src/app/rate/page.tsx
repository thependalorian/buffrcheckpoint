import { Suspense } from "react";

import type { Metadata } from "next";

import RateClient from "./rate-client";

// Operational page reached from the thank-you email: never indexed, never in the sitemap.
export const metadata: Metadata = {
  title: "Rate your visit",
  description: "Rate your visit and leave optional feedback.",
  robots: { index: false, follow: false },
};

export default function RatePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg p-6 text-sm text-muted-foreground" />}>
      <RateClient />
    </Suspense>
  );
}
