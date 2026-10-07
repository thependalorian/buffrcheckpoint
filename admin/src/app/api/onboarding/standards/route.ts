import { proxyToBackend } from "@/lib/auth/backend-proxy";

/** The owner accepts the organisation standards as they stand (Checkpoint's wording, or their own edits). */
export async function POST(request: Request) {
  return proxyToBackend(request, "/auth/onboarding/standards/accept", { method: "POST", body: {} });
}
