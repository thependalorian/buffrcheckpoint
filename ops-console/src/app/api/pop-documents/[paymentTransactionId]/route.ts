import { NextResponse } from "next/server";

import { getSessionToken } from "@/lib/auth/session";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:3001";

/** Relays POP document download with the staff session cookie → Bearer token. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentTransactionId: string }> },
) {
  const { paymentTransactionId } = await params;
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const upstream = await fetch(
    `${BACKEND_API_URL}/platform/billing/payments/${paymentTransactionId}/document`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => "");
    return NextResponse.json({ message: body || upstream.statusText }, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
