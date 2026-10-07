import { NextResponse } from "next/server";

import { buffrIdClient } from "@/lib/auth/buffr-id";

const BACKEND_API_URL = (process.env.BACKEND_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export async function GET(request: Request) {
  const client = buffrIdClient(new URL(request.url).origin);
  const backend = await fetch(`${BACKEND_API_URL}/auth/buffr-id/config`, { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ legacyPassword?: string }>) : null))
    .catch(() => null);
  return NextResponse.json({ enabled: client !== null, legacyPassword: backend?.legacyPassword ?? "on" });
}
