import { Suspense } from "react";

import type { Metadata } from "next";

import EmergencyClient from "./emergency-client";

// Reached from a printed QR code at the site: never indexed, never in the sitemap.
export const metadata: Metadata = {
  title: "Emergency information",
  description: "What to do in an emergency at this site.",
  robots: { index: false, follow: false },
};

export default function EmergencyPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-lg p-6 text-sm text-muted-foreground" />}>
      <EmergencyClient />
    </Suspense>
  );
}
