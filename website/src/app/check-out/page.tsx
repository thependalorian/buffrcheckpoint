import { Suspense } from "react";

import type { Metadata } from "next";

import CheckOutClient from "./check-out-client";

// Operational, not marketing — same class of page as /check-in, which
// already carries this same robots block (Section 11.9.8.1's rule for
// check-in applies identically here: kiosk/QR-driven, never in
// sitemap.ts). This page was missing it.
export const metadata: Metadata = {
  title: "Visitor check-out",
  description: "Check out as a visitor using your phone.",
  robots: { index: false, follow: false },
};

export default function CheckOutPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center p-6 text-sm text-muted-foreground">
          Loading sign-out…
        </main>
      }
    >
      <CheckOutClient />
    </Suspense>
  );
}
