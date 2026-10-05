import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { getSessionToken } from "@/lib/auth/session";

interface BackendError {
  code?: string;
  message?: string | { message?: string; missingEvidence?: string[] };
  missingEvidence?: string[];
  /** Onboarding 409: who last changed setup (§11.9.15.9). */
  changedBy?: string | null;
}

/**
 * Forwards a signed-in request to the backend and normalises errors to
 * `{ error, code, missingEvidence, changedBy? }` so client components read one shape.
 */
export async function proxyToBackend(
  request: Request,
  path: string,
  options: { method: "GET" | "POST"; body?: unknown },
): Promise<NextResponse> {
  if (options.method !== "GET" && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const backendResponse = await fetch(backendUrl(path), {
    method: options.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
  const payload = (await backendResponse.json().catch(() => ({}))) as BackendError & Record<string, unknown>;
  if (backendResponse.ok) {
    return NextResponse.json(payload, { status: backendResponse.status });
  }

  const nested = typeof payload.message === "object" ? payload.message : undefined;
  return NextResponse.json(
    {
      error: typeof payload.message === "string" ? payload.message : (nested?.message ?? "Request failed"),
      code: payload.code,
      missingEvidence: payload.missingEvidence ?? nested?.missingEvidence ?? [],
      ...(payload.changedBy === undefined ? {} : { changedBy: payload.changedBy }),
    },
    { status: backendResponse.status },
  );
}
