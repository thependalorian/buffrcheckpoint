import Link from "next/link";

import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Status",
  description: "Buffr Checkpoint platform capability and service posture for customers and operators.",
};

/** Marketing-facing summary — not a live incident feed (that lives in the Platform Ops Console). */
const components = [
  { name: "Core API", status: "Operational", note: "Authenticated tenant APIs and public check-in endpoints." },
  { name: "Customer admin", status: "Operational", note: "Dashboard, devices, and visitor operations." },
  { name: "Kiosk sync", status: "Operational", note: "Experience and branding sync; offline capture on device when connectivity drops." },
  { name: "USSD / DigiNam", status: "Not live", note: "Capability-gated — not offered as a live integration on this page until platform status marks them live." },
];

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "Operational") return "default";
  if (status === "Not live") return "outline";
  return "secondary";
}

export default function StatusPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader active="/status" />

      <main className="flex-1 py-16">
        <div className="mx-auto max-w-2xl px-4 lg:px-6">
          <h1 className="text-3xl font-bold tracking-tight">Platform status</h1>
          <p className="mt-3 text-muted-foreground text-sm">
            High-level posture for visitors and customers. Active incidents and maintenance windows for subscribed organisations
            are communicated through your admin contacts and support tickets — not duplicated here as a public incident board.
          </p>

          <ul className="mt-8 space-y-4">
            {components.map((row) => (
              <li key={row.name}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-muted-foreground text-sm">{row.note}</p>
                  </div>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </Card>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-muted-foreground text-sm">
            Need help?{" "}
            <Link href="/contact" className="text-foreground underline-offset-4 hover:underline">
              Contact support
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
