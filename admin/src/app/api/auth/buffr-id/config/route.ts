import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { buffrIdClient } from "@/lib/auth/buffr-id";

// Tells the sign-in and register pages whether to offer Buffr ID, and whether the password form is still open.
export async function GET(request: Request) {
  const client = buffrIdClient(new URL(request.url).origin);
  const backend = await fetch(backendUrl("/auth/buffr-id/config"), { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ legacyPassword?: string }>) : null))
    .catch(() => null);
  return NextResponse.json({ enabled: client !== null, issuer: client?.issuer ?? null, legacyPassword: backend?.legacyPassword ?? "on" });
}
