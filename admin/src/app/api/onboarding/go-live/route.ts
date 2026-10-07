import { NextResponse } from "next/server";

import { proxyToBackend } from "@/lib/auth/backend-proxy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AGREEMENTS = new Set(["terms", "privacy"]);

/**
 * Go live in one request, so the owner confirms once instead of three times: accept any agreement whose version changed, give the
 * launch acknowledgement, then go live. Each step stops the chain on failure and returns that step's error unchanged. Every step is
 * idempotent on the backend, so a retry after a partial failure is safe.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const acknowledgementId = body?.acknowledgementId;
  const acceptLegal: unknown = body?.acceptLegal ?? [];
  if (typeof acknowledgementId !== "string" || !UUID.test(acknowledgementId)) {
    return NextResponse.json({ error: "acknowledgementId must be a UUID" }, { status: 400 });
  }
  if (!Array.isArray(acceptLegal) || acceptLegal.some((doc) => typeof doc !== "string" || !AGREEMENTS.has(doc))) {
    return NextResponse.json({ error: "acceptLegal must list known agreements" }, { status: 400 });
  }

  if (acceptLegal.length > 0) {
    const legal = await proxyToBackend(request, "/legal/accept", { method: "POST", body: { documents: acceptLegal } });
    if (!legal.ok) return legal;
  }
  const acknowledged = await proxyToBackend(request, "/onboarding/training-acknowledgements", {
    method: "POST",
    body: { id: acknowledgementId },
  });
  if (!acknowledged.ok) return acknowledged;
  return proxyToBackend(request, "/auth/onboarding/complete-step", {
    method: "POST",
    body: { stepCode: "golive_approval" },
  });
}
