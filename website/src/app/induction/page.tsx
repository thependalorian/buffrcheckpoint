import { Suspense } from "react";

import type { Metadata } from "next";

import InductionClient from "./induction-client";

// Reached from a printed QR code at the site: never indexed, never in the sitemap.
export const metadata: Metadata = {
  title: "Contractor induction",
  description: "Read and confirm the site induction.",
  robots: { index: false, follow: false },
};

export default function InductionPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg p-6 text-sm text-muted-foreground" />}>
      <InductionClient />
    </Suspense>
  );
}
