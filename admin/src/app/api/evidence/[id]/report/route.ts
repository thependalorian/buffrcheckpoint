import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { getSessionToken } from "@/lib/auth/session";

/**
 * Opens the auditor-readable evidence report (HTML, printable to PDF) with
 * the session token attached server-side, same relay pattern as ../download.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const upstream = await fetch(backendUrl(`/evidence/${encodeURIComponent(id)}/report`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!upstream.ok) {
    const body = await upstream.text().catch(() => "");
    return NextResponse.json({ message: body || upstream.statusText }, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
