import { NextResponse } from "next/server";

import { getSessionToken } from "@/lib/auth/session";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:3001";

/** Relays the payment register CSV/XLSX export with the staff session → Bearer token. */
export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { search } = new URL(request.url);
  const upstream = await fetch(`${BACKEND_API_URL}/platform/billing/payments/export${search}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!upstream.ok) {
    const body = await upstream.text().catch(() => "");
    return NextResponse.json({ message: body || upstream.statusText }, { status: upstream.status });
  }
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/csv",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
