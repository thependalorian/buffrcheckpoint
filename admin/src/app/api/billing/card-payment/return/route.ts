import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";

/**
 * Adumo Online posts the card result here (RedirectSuccessfulURL and
 * RedirectFailedURL). The fields are relayed to the backend, which trusts
 * only Adumo's signed response token; this route never decides the outcome
 * itself. No session is needed: browsers do not send SameSite cookies on a
 * cross-site POST, and the token is the authentication.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") fields[key] = value;
  }

  const billing = new URL("/dashboard/billing", request.url);
  try {
    const upstream = await fetch(backendUrl("/public/payments/adumo/result"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
      cache: "no-store",
    });
    if (!upstream.ok) throw new Error(String(upstream.status));
    const result = (await upstream.json()) as { status: "succeeded" | "failed"; invoiceId: string | null };
    billing.searchParams.set("payment", result.status);
    if (result.invoiceId) billing.searchParams.set("invoice", result.invoiceId);
  } catch {
    billing.searchParams.set("payment", "error");
  }
  return NextResponse.redirect(billing, 303);
}
